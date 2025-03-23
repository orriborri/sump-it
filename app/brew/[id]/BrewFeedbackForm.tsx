"use client";

import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Rating,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/app/common/Input";
import type { FeedbackFormData } from "./types";
import { submitBrewFeedback } from "./actions";

interface Props {
  brewId: number;
}

export const BrewFeedbackForm = ({ brewId }: Props) => {
  const { control, handleSubmit, reset } = useForm<FeedbackFormData>({
    defaultValues: {
      too_strong: false,
      too_weak: false,
      is_sour: false,
      is_bitter: false,
      overall_rating: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await submitBrewFeedback(brewId, data);
    reset();
  });

  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Box component="form" onSubmit={onSubmit}>
        <Typography variant="h5" component="h2" gutterBottom>
          Brew Feedback
        </Typography>

        <Stack spacing={3} sx={{ mt: 3 }}>
          <Input
            control={control}
            name="coffee_amount_ml"
            label="How much coffee did you get? (ml)"
            type="number"
            rules={{
              min: { value: 0, message: "Must be positive" },
              max: { value: 1000, message: "Must be less than 1000" },
            }}
          />

          <FormGroup>
            <Typography variant="subtitle1" gutterBottom>
              How was the strength?
            </Typography>
            <Controller
              name="too_strong"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label="Too Strong"
                />
              )}
            />
            <Controller
              name="too_weak"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label="Too Weak"
                />
              )}
            />
          </FormGroup>

          <FormGroup>
            <Typography variant="subtitle1" gutterBottom>
              How was the taste?
            </Typography>
            <Controller
              name="is_sour"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label="Sour"
                />
              )}
            />
            <Controller
              name="is_bitter"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={<Checkbox checked={value} onChange={onChange} />}
                  label="Bitter"
                />
              )}
            />
          </FormGroup>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Overall Rating
            </Typography>
            <Controller
              name="overall_rating"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Rating
                  value={value ?? null}
                  onChange={(_, newValue) => {
                    onChange(newValue);
                  }}
                  precision={1}
                  size="large"
                />
              )}
            />
          </Box>
        </Stack>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
        >
          Submit Feedback
        </Button>
      </Box>
    </Paper>
  );
};
