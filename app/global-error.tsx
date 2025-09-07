'use client'

import React from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    // Log the error for debugging
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ 
        margin: 0, 
        padding: '2rem', 
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            color: '#8B4513', 
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            ☕ Coffee Brewing Error
          </h1>
          
          <p style={{ 
            color: '#666', 
            marginBottom: '1.5rem',
            lineHeight: '1.5'
          }}>
            Something went wrong with the Sump It coffee brewing app.
          </p>

          <div style={{
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
            fontSize: '0.875rem'
          }}>
            <strong>Error:</strong> {error.message || 'Unknown error occurred'}
            {error.digest && (
              <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.75rem' }}>
                Error ID: {error.digest}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#8B4513',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: 'transparent',
                color: '#8B4513',
                border: '1px solid #8B4513',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
