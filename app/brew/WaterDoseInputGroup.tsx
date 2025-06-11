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
      setValue("water", Math.round(dose * ratio));
    }

    if (lockedField === "dose" && water) {
      setValue("dose", Math.round(water / ratio));
    }
  }, [dose, water, ratio, lockedField, setValue]);

  const toggleLock = () => {
    setLockedField((prev) => (prev === "water" ? "dose" : "water"));
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="subtitle1">Amount</Typography>

      <Controller
        control={control}
        name="water"
        render={({ field }) => (
          <TextField
            {...field}
            label="Water (ml)"
            type="number"
            disabled={lockedField !== "water"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleLock}>
                    {lockedField === "water" ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
      />

      <Controller
        control={control}
        name="dose"
        render={({ field }) => (
          <TextField
            {...field}
            label="Beans (g)"
            type="number"
            disabled={lockedField !== "dose"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleLock}>
                    {lockedField === "dose" ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};
