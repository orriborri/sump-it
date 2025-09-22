import { metrics } from '@opentelemetry/api'

// Create a meter for custom application metrics
const meter = metrics.getMeter('sump-it-app', '1.0.0')

// Coffee brewing metrics
export const brewingMetrics = {
  // Counter for total brews created
  brewsTotal: meter.createCounter('coffee_brews_total', {
    description: 'Total number of coffee brews created'
  }),

  // Histogram for brew ratings
  brewRating: meter.createHistogram('coffee_brew_rating', {
    description: 'Distribution of coffee brew ratings'
  }),

  // Counter for different brewing methods
  brewingMethods: meter.createCounter('coffee_brewing_methods_total', {
    description: 'Total brews by brewing method'
  }),

  // Gauge for active brewing sessions
  activeBrewingSessions: meter.createUpDownCounter('coffee_active_brewing_sessions', {
    description: 'Number of active brewing sessions'
  }),

  // Histogram for brewing duration
  brewingDuration: meter.createHistogram('coffee_brewing_duration_seconds', {
    description: 'Time taken to complete a brew in seconds'
  }),

  // Counter for grinder usage
  grinderUsage: meter.createCounter('coffee_grinder_usage_total', {
    description: 'Total usage count by grinder'
  }),

  // Counter for bean usage
  beanUsage: meter.createCounter('coffee_bean_usage_total', {
    description: 'Total usage count by coffee bean type'
  })
}

// Database operation metrics
export const dbMetrics = {
  // Counter for database operations
  operations: meter.createCounter('database_operations_total', {
    description: 'Total database operations performed'
  }),

  // Histogram for query duration
  queryDuration: meter.createHistogram('database_query_duration_ms', {
    description: 'Database query execution time in milliseconds'
  }),

  // Counter for database errors
  errors: meter.createCounter('database_errors_total', {
    description: 'Total database errors encountered'
  })
}

// HTTP request metrics (supplementing auto-instrumentation)
export const httpMetrics = {
  // Counter for API requests
  requests: meter.createCounter('http_requests_total', {
    description: 'Total HTTP requests received'
  }),

  // Histogram for request duration
  requestDuration: meter.createHistogram('http_request_duration_ms', {
    description: 'HTTP request duration in milliseconds'
  }),

  // Counter for different response status codes
  responses: meter.createCounter('http_responses_total', {
    description: 'Total HTTP responses sent'
  })
}