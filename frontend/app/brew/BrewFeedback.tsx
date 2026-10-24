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
  Grid2 as Grid,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import { RATING_MAX, RATING_MIN, RATING_STEP, type BrewFormData } from '@/lib/brew/recipe';

/** Props for {@link BrewFeedback}. */
interface BrewFeedbackProps {
  /** The current brew form data. */
  formData: BrewFormData;
  /** Applies a partial update to the parent brew form. */
  updateFormData: (updates: Partial<BrewFormData>) => void;
  /** Invoked when the user submits the completed brew. */
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

/** Props for {@link RatingField}. */
interface RatingFieldProps {
  /** The current rating, or undefined when no rating is set. */
  rating: number | undefined;
  /** Handles a change of the selected rating. */
  onChange: (event: SelectChangeEvent) => void;
}

/** Render the empty rating choice as a direct Select child. */
function noRatingOption(): React.ReactNode {
  return (
    <MenuItem value="">
      <em>No rating</em>
    </MenuItem>
  );
}

/** The rating dropdown (1.0 to 10.0 in 0.5 steps, plus a "No rating" option). */
const RatingField: React.FC<RatingFieldProps> = ({ rating, onChange }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <FormControl fullWidth>
      <InputLabel id="rating-label">Rating</InputLabel>
      <Select
        labelId="rating-label"
        id="rating-select"
        label="Rating"
        value={rating === undefined ? '' : String(rating)}
        onChange={onChange}
      >
        {noRatingOption()}
        {ratingOptions().map((value) => (
          <MenuItem key={value} value={String(value)}>
            {value.toFixed(1)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>
);

/** Props for {@link NotesField}. */
interface NotesFieldProps {
  /** The field label. */
  label: string;
  /** The current field value. */
  value: string;
  /** Handles a change of the field value. */
  onChange: (value: string) => void;
}

/** A full-width multiline text field for one of the free-text note sections. */
const NotesField: React.FC<NotesFieldProps> = ({ label, value, onChange }) => (
  <Grid size={12}>
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
 * The "Brew & Rate" step: an optional quality rating (1.0 to 10.0 in 0.5 steps,
 * matching the backend rule) plus free-text tasting notes, feedback and
 * suggestions, all persisted with the session.
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
        <RatingField rating={formData.rating} onChange={handleRatingChange} />

        <NotesField
          label="Tasting notes"
          value={formData.tastingNotes ?? ''}
          onChange={(value) => updateFormData({ tastingNotes: value })}
        />
        <NotesField
          label="Feedback"
          value={formData.feedback ?? ''}
          onChange={(value) => updateFormData({ feedback: value })}
        />
        <NotesField
          label="Suggestions"
          value={formData.suggestions ?? ''}
          onChange={(value) => updateFormData({ suggestions: value })}
        />
      </Grid>
    </Box>
  );
}
