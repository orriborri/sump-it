// Brewing Parameters step (ticket #145).
//
// Collects the coffee dose, water weight and grind setting, shows the live
// coffee ratio as the amounts change, and keeps the grind setting bounded to
// the selected grinder's min/max range. Optional water temperature and brew
// time are also captured here. All pure logic lives in `lib/brew/recipe.ts`;
// this component is a thin MUI shell over it.
'use client';

import React from 'react';
import { Alert, Box, Grid, InputAdornment, TextField, Typography } from '@mui/material';
import type { BrewingSession, Grinder } from '@/lib/api/types';
import {
  clampGrindSetting,
  liveCoffeeRatio,
  parseNumber,
  parseOptionalNumber,
  type BrewFormData,
} from '@/lib/brew/recipe';

/** Props for the Brewing Parameters step. */
interface BrewingParametersProps {
  formData: BrewFormData;
  updateFormData: (updates: Partial<BrewFormData>) => void;
  previousSessions: BrewingSession[];
  isLoading: boolean;
  selectedGrinder?: Grinder;
}

/**
 * Brewing Parameters step: captures coffee dose, water weight and grind
 * setting, shows the live coffee ratio, and bounds the grind setting to the
 * selected grinder's range. Optional water temperature and brew time are also
 * collected here.
 *
 * @param props - The step props.
 * @param props.formData - The current brew form state.
 * @param props.updateFormData - Applies a partial update to the brew form.
 * @param props.previousSessions - Recent sessions shown for reference.
 * @param props.isLoading - Whether the reference sessions are still loading.
 * @param props.selectedGrinder - The chosen grinder, used to bound the grind setting.
 * @returns The rendered brewing-parameters form.
 */
export function BrewingParameters({
  formData,
  updateFormData,
  previousSessions,
  isLoading,
  selectedGrinder,
}: BrewingParametersProps) {
  const ratio = liveCoffeeRatio(formData.coffeeGrams, formData.waterGrams);

  const handleGrindChange = (raw: string) => {
    // Keep the grind setting inside the selected grinder's physical range.
    updateFormData({ grindSetting: clampGrindSetting(parseNumber(raw), selectedGrinder) });
  };

  const grindHelper = selectedGrinder
    ? `Range for ${selectedGrinder.brand} ${selectedGrinder.model}: ${selectedGrinder.minSetting}-${selectedGrinder.maxSetting}`
    : 'Select a grinder to bound this setting';

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2C1810', mb: 2 }}>
        Brewing Parameters
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Coffee"
            type="number"
            fullWidth
            value={formData.coffeeGrams}
            onChange={(e) => updateFormData({ coffeeGrams: parseNumber(e.target.value) })}
            InputProps={{ endAdornment: <InputAdornment position="end">g</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Water"
            type="number"
            fullWidth
            value={formData.waterGrams}
            onChange={(e) => updateFormData({ waterGrams: parseNumber(e.target.value) })}
            InputProps={{ endAdornment: <InputAdornment position="end">g</InputAdornment> }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Grind setting"
            type="number"
            fullWidth
            value={formData.grindSetting}
            onChange={(e) => handleGrindChange(e.target.value)}
            helperText={grindHelper}
            inputProps={
              selectedGrinder
                ? { min: selectedGrinder.minSetting, max: selectedGrinder.maxSetting }
                : {}
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Water temperature"
            type="number"
            fullWidth
            value={formData.waterTempCelsius ?? ''}
            onChange={(e) => updateFormData({ waterTempCelsius: parseOptionalNumber(e.target.value) })}
            InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Brew time"
            type="number"
            fullWidth
            value={formData.brewTimeSeconds ?? ''}
            onChange={(e) => updateFormData({ brewTimeSeconds: parseOptionalNumber(e.target.value) })}
            InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
          />
        </Grid>
      </Grid>

      {/* Live coffee ratio, recomputed as coffee/water change. */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#F5F5F5', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#8B4513' }}>
          Coffee Ratio
        </Typography>
        <Typography variant="h5" aria-label="coffee-ratio" sx={{ color: '#4CAF50', fontWeight: 600 }}>
          {ratio}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        {isLoading
          ? 'Loading previous sessions…'
          : `${previousSessions.length} previous session(s) available for reference.`}
      </Alert>
    </Box>
  );
}
