import {
  trace,
  SpanStatusCode,
  SpanKind,
  type Attributes,
} from '@opentelemetry/api'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
  traceId?: string
  spanId?: string
}

/**
 * Structured logger that integrates with OpenTelemetry tracing.
 * Automatically attaches trace and span IDs to log entries, records log events
 * on the active span, and formats output for both development and production environments.
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private tracer = trace.getTracer('sump-it-logger', '1.0.0')

  /**
   * Retrieves the current OpenTelemetry trace and span IDs from the active span context.
   * @returns An object containing traceId and spanId if an active span exists, otherwise an empty object
   */
  private getTraceContext() {
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      const spanContext = activeSpan.spanContext()
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      }
    }
    return {}
  }

  /**
   * Formats a log entry into a structured string with timestamp, level, message,
   * optional trace context, context data, and error information.
   * @param entry - The log entry object to format
   * @returns A formatted log string suitable for console output
   */
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

  /**
   * Core logging method that creates a structured log entry, attaches it to the
   * active OpenTelemetry span as an event, and writes to the console based on
   * environment and log level. In production, only warn and error levels are output.
   * @param level - The severity level of the log message
   * @param message - The log message text
   * @param context - Optional key-value metadata to include with the log entry
   * @param error - Optional Error object to attach to the log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    const traceContext = this.getTraceContext()
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      ...traceContext,
    }

    const formatted = this.formatMessage(entry)

    // Add attributes to current span if available
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      activeSpan.addEvent(`log.${level}`, {
        'log.message': message,
        'log.level': level,
        ...(context && { 'log.context': JSON.stringify(context) }),
        ...(error && { 'log.error': error.message }),
      })

      if (error && level === 'error') {
        activeSpan.recordException(error)
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        })
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

  /**
   * Wraps an operation in an OpenTelemetry span for distributed tracing.
   * Automatically records success/failure status and handles both synchronous
   * and asynchronous operations. On failure, logs the error and records the
   * exception on the span before rethrowing.
   * @param name - The name of the span (typically the operation being performed)
   * @param operation - The function to execute within the span context
   * @param attributes - Optional OpenTelemetry attributes to attach to the span
   * @returns The result of the operation
   */
  // Create a span for operations
  withSpan<T>(
    name: string,
    operation: () => T | Promise<T>,
    attributes?: Attributes
  ): T | Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      { kind: SpanKind.INTERNAL, attributes },
      span => {
        try {
          const result = operation()
          if (result instanceof Promise) {
            return result
              .then(value => {
                span.setStatus({ code: SpanStatusCode.OK })
                return value
              })
              .catch((error: Error) => {
                this.error(
                  `Operation ${name} failed`,
                  { operation: name },
                  error
                )
                span.recordException(error)
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error.message,
                })
                throw error
              })
              .finally(() => {
                span.end()
              })
          }
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return result
        } catch (error) {
          this.error(
            `Operation ${name} failed`,
            { operation: name },
            error as Error
          )
          span.recordException(error as Error)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          })
          span.end()
          throw error
        }
      }
    )
  }

  /**
   * Logs a debug-level message. Only output in development environments.
   * @param message - The debug message text
   * @param context - Optional key-value metadata to include with the log entry
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  /**
   * Logs an info-level message. Only output in development environments.
   * @param message - The informational message text
   * @param context - Optional key-value metadata to include with the log entry
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  /**
   * Logs a warning-level message. Output in both development and production.
   * @param message - The warning message text
   * @param context - Optional key-value metadata to include with the log entry
   * @param error - Optional Error object associated with the warning
   */
  warn(message: string, context?: Record<string, unknown>, error?: Error) {
    this.log('warn', message, context, error)
  }

  /**
   * Logs an error-level message. Output in both development and production.
   * Records the exception on the active OpenTelemetry span and sets its status to ERROR.
   * @param message - The error message text
   * @param context - Optional key-value metadata to include with the log entry
   * @param error - Optional Error object to record and attach to the span
   */
  error(message: string, context?: Record<string, unknown>, error?: Error) {
    this.log('error', message, context, error)
  }
}

/** Singleton logger instance for application-wide structured logging with OpenTelemetry integration */
export const logger = new Logger()
