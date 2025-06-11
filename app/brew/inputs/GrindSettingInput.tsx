"use client";
import React from 'react';
import { 
  Box, 
  TextField,
  Typography,
  Slider,
  Stack
} from '@mui/material';
import { FormData } from '../types';

interface GrindSettingInputProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFormData: (data: FormData) => void;
}

export const GrindSettingInput: React.FC<GrindSettingInputProps> = ({
  formData,
  handleChange,
  setFormData
}) => {
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setFormData({
      ...formData,
      grind: newValue as number
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Set your grinder setting for this brew
      </Typography>
      
      <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography>Fine</Typography>
        <Slider
          value={formData.grind}
          onChange={handleSliderChange}
          aria-labelledby="grind-setting-slider"
          valueLabelDisplay="auto"
          step={1}
          marks
          min={1}
          max={40}
        />
        <Typography>Coarse</Typography>
      </Stack>
      
      <TextField
        fullWidth
        label="Grind Setting"
        name="grind"
        type="number"
        value={formData.grind}
        onChange={handleChange}
        inputProps={{ min: 1, max: 40 }}
      />
    </Box>
  );
};