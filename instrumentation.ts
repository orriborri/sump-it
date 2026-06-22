// This file is required for Next.js instrumentation
// It will be automatically loaded when the app starts

/**
 * Next.js instrumentation hook that initializes OpenTelemetry for the Node.js runtime.
 * This function is automatically called when the application starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./app/lib/telemetry')
  }
}