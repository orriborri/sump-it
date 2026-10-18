// Brew & Rate step (STUB).
//
// NOTE: This is a minimal placeholder added by ticket #141 so the brew page
// type-checks. The full feedback/rating UI is implemented in a later ticket.
// Keep the prop shape in sync with `app/brew/page.tsx`.
'use client';

import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

interface BrewFormData {
  rating?: number;
  tastingNotes?: string;
  feedback?: string;
  suggestions?: string;
}

interface BrewFeedbackProps {
  formData: BrewFormData;
  updateFormData: (updates: Partial<BrewFormData>) => void;
  onSubmit: () => void;
}

export function BrewFeedback({ formData }: BrewFeedbackProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2C1810', mb: 2 }}>
        Brew &amp; Rate
      </Typography>
      <Alert severity="info">
        Feedback capture is coming soon.
        {formData.rating ? ` Current rating: ${formData.rating}.` : ''}
      </Alert>
    </Box>
  );
}
