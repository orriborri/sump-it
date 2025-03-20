import { Controller, Control } from "react-hook-form";
import { Box, FormControl, FormLabel, Typography, Slider } from "@mui/material";
import { FeedbackFormData } from "../types";

interface Props {
  control: Control<FeedbackFormData>;
}

const marks = [
  { value: -5, label: "5" },
  { value: -4, label: "4" },
  { value: -3, label: "3" },
  { value: -2, label: "2" },
  { value: -1, label: "1" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

export function TasteBalanceSlider({ control }: Props) {
  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <FormControl fullWidth>
        <FormLabel>Taste Balance</FormLabel>
        <Box
          sx={{
            mt: 2,
            mb: 1,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Sour
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bitter
          </Typography>
        </Box>
        <Controller
          name="taste_balance"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Slider
              value={value}
              onChange={(_, newValue) => onChange(newValue)}
              min={-5}
              max={5}
              marks={marks}
              sx={{
                "& .MuiSlider-markLabel": {
                  fontSize: "0.75rem",
                },
              }}
            />
          )}
        />
      </FormControl>
    </Box>
  );
}
