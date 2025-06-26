"use client";
import React from 'react';
import { Alert, Button, Box, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={this.resetError}
                startIcon={<Refresh />}
              >
                Try Again
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Custom fallback component for brew workflow
export const BrewErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <Box sx={{ p: 3, textAlign: 'center' }}>
    <Alert severity="error" sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Brewing Workflow Error
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {error?.message || 'Something went wrong with the brewing process'}
      </Typography>
    </Alert>
    
    <Button 
      variant="contained" 
      onClick={resetError}
      startIcon={<Refresh />}
    >
      Start Over
    </Button>
  </Box>
);
