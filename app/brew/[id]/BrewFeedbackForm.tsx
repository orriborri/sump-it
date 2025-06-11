"use client";
"use client";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Controller } from "react-hook-form";

const FeedbackScale = ({
  name,
  label,
  control,
  options,
}: {
  name: "sourness" | "bitterness" | "strength";
  label: string;
  control: any;
  options: { value: number; label: string }[];
}) => (
  <Box>
    <Typography gutterBottom>{label}</Typography>
    <Controller
      control={control}
      name={name}
      defaultValue={options[Math.floor(options.length / 2)].value}
      render={({ field }) => (
        <ToggleButtonGroup
          exclusive
          value={field.value}
          onChange={(_, val) => val !== null && field.onChange(val)}
          size="small"
          color="primary"
        >
          {options.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    />
  </Box>
);

export const BrewFeedbackStep = ({ control }: { control: any }) => {
  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Typography variant="h6" fontWeight={600}>
        Brew Feedback
      </Typography>

      <FeedbackScale
        name="sourness"
        label="Sourness"
        control={control}
        options={[
          { value: 1, label: "Not sour" },
          { value: 2, label: "Slightly sour" },
          { value: 3, label: "Too sour" },
        ]}
      />

      <FeedbackScale
        name="bitterness"
        label="Bitterness"
        control={control}
        options={[
          { value: 1, label: "Not bitter" },
          { value: 2, label: "Slightly bitter" },
          { value: 3, label: "Too bitter" },
        ]}
      />

      <FeedbackScale
        name="strength"
        label="Strength"
        control={control}
        options={[
          { value: 1, label: "Very weak" },
          { value: 2, label: "Mild" },
          { value: 3, label: "Medium" },
          { value: 4, label: "Strong" },
          { value: 5, label: "Very strong" },
        ]}
      />
    </Box>
  );
};
