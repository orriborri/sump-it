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
  Divider,
  Grid,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/app/common/Input";
import type { FeedbackFormData, RecentBrewFeedback } from "./types";
import { submitBrewFeedback } from "./actions";
import { format } from "date-fns";

interface Props {
  brewId: number;
  recentFeedback: RecentBrewFeedback[];
}

export const BrewFeedbackForm = ({ brewId, recentFeedback }: Props) => {
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
    <Stack spacing={4} sx={{ maxWidth: 600, mx: "auto" }}>
      {recentFeedback.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Recent Brews
          </Typography>
          <Stack spacing={2}>
            {recentFeedback.map((feedback) => (
              <Card key={feedback.feedback_id} variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {format(new Date(feedback.created_at), "MMM d, yyyy")}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Grind: {feedback.grind ?? "Not specified"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Ratio:{" "}
                        {feedback.ratio
                          ? `${feedback.ratio}:1`
                          : "Not specified"}
                      </Typography>
                    </Grid>
                    {feedback.coffee_amount_ml && (
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          Coffee amount: {feedback.coffee_amount_ml} ml
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        {feedback.too_strong && (
                          <Chip
                            size="small"
                            label="Too Strong"
                            color="warning"
                          />
                        )}
                        {feedback.too_weak && (
                          <Chip size="small" label="Too Weak" color="warning" />
                        )}
                        {feedback.is_sour && (
                          <Chip size="small" label="Sour" color="error" />
                        )}
                        {feedback.is_bitter && (
                          <Chip size="small" label="Bitter" color="error" />
                        )}
                      </Stack>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography component="span" variant="body2">
                        Rating:
                      </Typography>{" "}
                      <Rating
                        value={feedback.overall_rating ?? 0}
                        readOnly
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
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
    </Stack>
  );
};
