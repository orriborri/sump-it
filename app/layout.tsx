import React from 'react'
import { Container, Box } from '@mui/material'
import { Header } from './common/Header'
import { ThemeProvider } from './providers/ThemeProvider'

export const metadata = {
  title: 'Sump It',
  description: 'Coffee brewing app',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <style>{`
          html, body {
            overflow-x: hidden;
            max-width: 100vw;
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Container
            maxWidth="lg"
            sx={{
              px: { xs: 1, sm: 2 },
              width: '100%',
              maxWidth: '100vw',
              overflow: 'hidden',
            }}
          >
            <Header />
            <Box sx={{ width: '100%', overflow: 'hidden' }}>{children}</Box>
          </Container>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
