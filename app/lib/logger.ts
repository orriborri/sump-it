import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  traceId?: string
  spanId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private tracer = trace.getTracer('sump-it-logger', '1.0.0')

  private getTraceContext() {
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      const spanContext = activeSpan.spanContext()
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId
      }
    }
    return {}
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error, traceId, spanId } = entry
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    
    if (traceId && spanId) {
      formatted += ` | trace_id=${traceId} span_id=${spanId}`
    }
    
    if (context) {
      formatted += ` | Context: ${JSON.stringify(context)}`
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`
      if (this.isDevelopment && error.stack) {
        formatted += `\n${error.stack}`
      }
    }
    
    return formatted
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const traceContext = this.getTraceContext()
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      ...traceContext
    }

    const formatted = this.formatMessage(entry)

    // Add attributes to current span if available
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      activeSpan.addEvent(`log.${level}`, {
        'log.message': message,
        'log.level': level,
        ...(context && { 'log.context': JSON.stringify(context) }),
        ...(error && { 'log.error': error.message })
      })

      if (error && level === 'error') {
        activeSpan.recordException(error)
        activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      }
    }

    // Console output (allowed for logging infrastructure)
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](formatted)
    } else {
      // Only log warnings and errors in production
      if (level === 'warn' || level === 'error') {
        // eslint-disable-next-line no-console
        console[level](formatted)
      }
    }
  }

  // Create a span for operations
  withSpan<T>(name: string, operation: () => T | Promise<T>, attributes?: Record<string, any>): T | Promise<T> {
    return this.tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL, attributes }, (span) => {
      try {
        const result = operation()
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.error(`Operation ${name} failed`, { operation: name }, error)
            span.recordException(error)
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
            throw error
          }).finally(() => {
            span.end()
          })
        }
        span.setStatus({ code: SpanStatusCode.OK })
        span.end()
        return result
      } catch {
        this.error(`Operation ${name} failed`, { operation: name }, error as Error)
        span.recordException(error as Error)
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
        span.end()
        throw error
      }
    })
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error)
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error)
  }
}

export const logger = new Logger()