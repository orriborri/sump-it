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
 * Renders the rating selector: a "No rating" option plus every allowed rating
 * value from 1.0 to 10.0 in 0.5 steps.
 *
 * @param props - The rating-field props.
 * @param props.value - The current select value ('' for no rating).
 * @param props.onChange - Invoked when the selected rating changes.
 * @returns The rendered rating selector wrapped in its grid cell.
 */
const RatingField: React.FC<{
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ value, onChange }) => (
  <Grid item xs={12} sm={6}>
    <FormControl fullWidth>
      <InputLabel id="rating-label">Rating</InputLabel>
      <Select
        labelId="rating-label"
        id="rating-select"
        label="Rating"
        value={value}
        onChange={onChange}
      >
        <MenuItem value="">
          <em>No rating</em>
        </MenuItem>
        {ratingOptions().map((option) => (
          <MenuItem key={option} value={String(option)}>
            {option.toFixed(1)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>
);

/**
 * Renders a full-width multiline text field in its own grid cell, used for the
 * tasting notes, feedback and suggestions inputs.
 *
 * @param props - The field props.
 * @param props.label - The field label.
 * @param props.value - The current field value.
 * @param props.onChange - Invoked with the new value when the field changes.
 * @returns The rendered multiline field wrapped in its grid cell.
 */
const MultilineField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <Grid item xs={12}>
    <TextField
      label={label}
      fullWidth
      multiline
      minRows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </Grid>
);

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
        <RatingField
          value={formData.rating === undefined ? '' : String(formData.rating)}
          onChange={handleRatingChange}
        />

        <MultilineField
          label="Tasting notes"
          value={formData.tastingNotes ?? ''}
          onChange={(value) => updateFormData({ tastingNotes: value })}
        />
        <MultilineField
          label="Feedback"
          value={formData.feedback ?? ''}
          onChange={(value) => updateFormData({ feedback: value })}
        />
        <MultilineField
          label="Suggestions"
          value={formData.suggestions ?? ''}
          onChange={(value) => updateFormData({ suggestions: value })}
        />
      </Grid>
    </Box>
  );
}
