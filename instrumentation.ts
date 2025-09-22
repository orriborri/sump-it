// This file is required for Next.js instrumentation
// It will be automatically loaded when the app starts

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./app/lib/telemetry')
  }
}