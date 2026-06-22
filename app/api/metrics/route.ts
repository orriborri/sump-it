import { NextResponse } from 'next/server'

// This endpoint provides information about metrics availability
// The actual Prometheus metrics are served by OpenTelemetry on port 9090

/**
 * Metrics information API endpoint.
 * Returns metadata about where actual Prometheus metrics can be accessed
 * (served by OpenTelemetry on port 9090).
 * @returns JSON response with metrics endpoint information
 */
export async function GET() {
  try {
    const metricsInfo = {
      message: 'Metrics are available via OpenTelemetry',
      prometheus_endpoint: 'http://localhost:9090/metrics',
      health_endpoint: '/api/health',
      service: 'sump-it',
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(metricsInfo, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to provide metrics information' },
      { status: 500 }
    )
  }
}
