import { NextResponse } from 'next/server'
import { db } from '../../lib/database'
import { logger } from '../../lib/logger'
import { trace, metrics } from '@opentelemetry/api'

const tracer = trace.getTracer('sump-it-health', '1.0.0')
const meter = metrics.getMeter('sump-it-health', '1.0.0')

// Create metrics
const healthCheckCounter = meter.createCounter('health_check_total', {
  description: 'Total number of health checks performed'
})

const healthCheckDuration = meter.createHistogram('health_check_duration_ms', {
  description: 'Duration of health checks in milliseconds'
})

const dbConnectionGauge = meter.createUpDownCounter('database_connection_status', {
  description: 'Database connection status (1 = connected, 0 = disconnected)'
})

export async function GET() {
  const startTime = Date.now()
  
  return tracer.startActiveSpan('health_check', async (span) => {
    try {
      span.setAttributes({
        'service.name': 'sump-it',
        'health.check.type': 'full'
      })

      // Test database connection with timeout
      const dbStart = Date.now()
      await Promise.race([
        db.selectFrom('beans').select('id').limit(1).execute(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        )
      ])
      const dbDuration = Date.now() - dbStart

      // Get some basic stats for monitoring (simplified for now)
      let beansCount = { count: 0 }
      let brewsCount = { count: 0 }
      
      try {
        const beansResult = await db.selectFrom('beans').select('id').execute()
        beansCount = { count: beansResult.length }
        
        const brewsResult = await db.selectFrom('brews').select('id').execute()
        brewsCount = { count: brewsResult.length }
      } catch (countError) {
        // If counting fails, just log it but don't fail the health check
        logger.warn('Failed to get table counts', {}, countError as Error)
      }

      const duration = Date.now() - startTime
      
      // Record metrics
      healthCheckCounter.add(1, { status: 'success' })
      healthCheckDuration.record(duration)
      dbConnectionGauge.add(1)

      span.setAttributes({
        'health.status': 'healthy',
        'database.connection.duration_ms': dbDuration,
        'database.beans.count': beansCount?.count || 0,
        'database.brews.count': brewsCount?.count || 0
      })

      logger.info('Health check successful', {
        duration_ms: duration,
        db_duration_ms: dbDuration,
        beans_count: beansCount?.count || 0,
        brews_count: brewsCount?.count || 0
      })

      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          response_time_ms: dbDuration
        },
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        stats: {
          beans: beansCount?.count || 0,
          brews: brewsCount?.count || 0
        }
      })
    } catch {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Record metrics
      healthCheckCounter.add(1, { status: 'error' })
      healthCheckDuration.record(duration)
      dbConnectionGauge.add(-1)

      span.recordException(error as Error)
      span.setAttributes({
        'health.status': 'unhealthy',
        'error.message': errorMessage
      })

      logger.error('Health check failed', {
        duration_ms: duration,
        error: errorMessage
      }, error as Error)

      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: {
            status: 'disconnected',
            error: errorMessage
          },
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        },
        { status: 503 }
      )
    } finally {
      span.end()
    }
  })
}