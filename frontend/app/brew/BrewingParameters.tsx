// Brewing Parameters step (STUB).
//
// NOTE: This is a minimal placeholder added by ticket #141 so the brew page
// type-checks. The full parameter-entry UI (coffee/water amounts, grind
// setting, ratio suggestions from previous sessions) is implemented in a later
// ticket. Keep the prop shape in sync with `app/brew/page.tsx`.
'use client';

import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import type { BrewingSession } from '@/lib/api/types';

interface BrewFormData {
  coffeeGrams: number;
  waterGrams: number;
  grindSetting: number;
  waterTempCelsius?: number;
  brewTimeSeconds?: number;
}

interface BrewingParametersProps {
  formData: BrewFormData;
  updateFormData: (updates: Partial<BrewFormData>) => void;
  previousSessions: BrewingSession[];
  isLoading: boolean;
}

export function BrewingParameters({
  formData,
  previousSessions,
  isLoading,
}: BrewingParametersProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2C1810', mb: 2 }}>
        Brewing Parameters
      </Typography>
      <Alert severity="info">
        Parameter entry is coming soon. Current: {formData.coffeeGrams}g coffee /{' '}
        {formData.waterGrams}g water, grind {formData.grindSetting}.
        {isLoading
          ? ' Loading previous sessions…'
          : ` ${previousSessions.length} previous session(s) available.`}
      </Alert>
    </Box>
  );
}
