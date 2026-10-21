// Brew & Rate step (ticket #145).
//
// Captures the optional quality rating (1.0 to 10.0 in 0.5 steps, matching the
// backend rule) plus free-text tasting notes, feedback and suggestions, all of
// which are persisted with the session. Rating options come from the pure
// `lib/brew/recipe.ts` helpers so the step boundaries are defined in one place.
'use client';

import React from 'react';
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import { RATING_MAX, RATING_MIN, RATING_STEP, type BrewFormData } from '@/lib/brew/recipe';

/** Props for the Brew and Rate step. */
interface BrewFeedbackProps {
  formData: BrewFormData;
  updateFormData: (updates: Partial<BrewFormData>) => void;
  onSubmit: () => void;
}

/** The allowed rating values: 1.0 to 10.0 inclusive in 0.5 steps. */
function ratingOptions(): number[] {
  const options: number[] = [];
  for (let value = RATING_MIN; value <= RATING_MAX + 1e-9; value += RATING_STEP) {
    options.push(Number(value.toFixed(1)));
  }
  return options;
}

/**
 * Brew and Rate step: captures the optional quality rating (1.0 to 10.0 in 0.5
 * steps) along with free-text tasting notes, feedback and suggestions for the
 * session.
 *
 * @param props - The step props.
 * @param props.formData - The current brew form state.
 * @param props.updateFormData - Applies a partial update to the brew form.
 * @param props.onSubmit - Invoked to save the completed session.
 * @returns The rendered brew-and-rate form.
 */
export function BrewFeedback({ formData, updateFormData }: BrewFeedbackProps) {
  const handleRatingChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    updateFormData({ rating: value === '' ? undefined : Number(value) });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2C1810', mb: 2 }}>
        Brew &amp; Rate
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="rating-label">Rating</InputLabel>
            <Select
              labelId="rating-label"
              id="rating-select"
              label="Rating"
              value={formData.rating === undefined ? '' : String(formData.rating)}
              onChange={handleRatingChange}
            >
              <MenuItem value="">
                <em>No rating</em>
              </MenuItem>
              {ratingOptions().map((value) => (
                <MenuItem key={value} value={String(value)}>
                  {value.toFixed(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Tasting notes"
            fullWidth
            multiline
            minRows={2}
            value={formData.tastingNotes ?? ''}
            onChange={(e) => updateFormData({ tastingNotes: e.target.value })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Feedback"
            fullWidth
            multiline
            minRows={2}
            value={formData.feedback ?? ''}
            onChange={(e) => updateFormData({ feedback: e.target.value })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Suggestions"
            fullWidth
            multiline
            minRows={2}
            value={formData.suggestions ?? ''}
            onChange={(e) => updateFormData({ suggestions: e.target.value })}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
