import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { logger } from './logger'

// Initialize OpenTelemetry
const init = () => {
  // Prometheus metrics exporter
  const prometheusExporter = new PrometheusExporter({
    port: 9090, // Prometheus metrics endpoint
    endpoint: '/metrics',
  })

  const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some instrumentations that might be noisy
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
        // Enable database instrumentation
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
        },
        // Enable HTTP instrumentation
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
      }),
    ],
  })

  sdk.start()
  
  logger.info('OpenTelemetry initialized successfully', {
    metricsPort: 9090,
    service: 'sump-it'
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => {
        logger.info('OpenTelemetry terminated successfully')
      })
      .catch((error) => {
        logger.error('Error terminating OpenTelemetry', {}, error as Error)
      })
      .finally(() => process.exit(0))
  })
}

init()