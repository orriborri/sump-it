import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import type { BrewFormData } from "../types";

interface Props {
  control: any;
  watch: any;
  setValue: any;
}

export const WaterDoseInputGroup = ({ control, watch, setValue }: Props) => {
  const [lockedField, setLockedField] = useState<"water" | "dose">("water");

  const ratio = watch("ratio");
  const water = watch("water");
  const dose = watch("dose");

  useEffect(() => {
    if (!ratio) return;

    if (lockedField === "water" && dose) {
      setValue("water", dose * ratio);
    } else if (lockedField === "dose" && water) {
      setValue("dose", water / ratio);
    }
  }, [ratio, water, dose, lockedField, setValue]);

  const toggleLock = () => {
    setLockedField(lockedField === "water" ? "dose" : "water");
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">Water and Dose</Typography>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Controller
            name="ratio"
            control={control}
            defaultValue={16}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Ratio (Water:Coffee)"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">:1</InputAdornment>,
                }}
                error={!!error}
                helperText={error?.message}
                onChange={(e) => {
                  field.onChange(Number(e.target.value));
                }}
              />
            )}
          />
        </Box>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Controller
            name="water"
            control={control}
            defaultValue={240}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Water"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">ml</InputAdornment>,
                }}
                error={!!error}
                helperText={error?.message}
                disabled={lockedField === "water"}
                onChange={(e) => {
                  field.onChange(Number(e.target.value));
                }}
              />
            )}
          />
          <IconButton onClick={toggleLock}>
            {lockedField === "water" ? <LockIcon /> : <LockOpenIcon />}
          </IconButton>
        </Box>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Controller
            name="dose"
            control={control}
            defaultValue={15}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Coffee Dose"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">g</InputAdornment>,
                }}
                error={!!error}
                helperText={error?.message}
                disabled={lockedField === "dose"}
                onChange={(e) => {
                  field.onChange(Number(e.target.value));
                }}
              />
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};
