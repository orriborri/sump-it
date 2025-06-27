import React, { useState } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { FormInputProps } from "./formTypes";

export const WaterDoseInputGroup = ({ formData, updateFormData }: FormInputProps) => {
  const [lockedField, setLockedField] = useState<"water" | "dose">("water");
  
  const ratio = formData.ratio;
  const water = formData.water;
  const dose = formData.dose;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = Number(value);
    
    // Update the changed field
    updateFormData({ [name]: numValue });
    
    // Auto-calculate the other field based on ratio if it's locked
    if (name === "ratio") {
      if (lockedField === "water" && dose) {
        updateFormData({ water: Math.round(dose * numValue) });
      } else if (lockedField === "dose" && water) {
        updateFormData({ dose: Math.round(water / numValue) });
      }
    } else if (name === "dose" && lockedField === "water") {
      updateFormData({ water: Math.round(numValue * Number(ratio)) });
    } else if (name === "water" && lockedField === "dose") {
      updateFormData({ dose: Math.round(numValue / Number(ratio)) });
    }
  };

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
          <TextField
            fullWidth
            label="Ratio (Water:Coffee)"
            type="number"
            name="ratio"
            value={ratio}
            InputProps={{
              endAdornment: <InputAdornment position="end">:1</InputAdornment>,
            }}
            onChange={handleChange}
          />
        </Box>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            fullWidth
            label="Water"
            type="number"
            name="water"
            value={water}
            InputProps={{
              endAdornment: <InputAdornment position="end">ml</InputAdornment>,
            }}
            disabled={lockedField === "water"}
            onChange={handleChange}
          />
          <IconButton onClick={toggleLock}>
            {lockedField === "water" ? <LockIcon /> : <LockOpenIcon />}
          </IconButton>
        </Box>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            fullWidth
            label="Coffee Dose"
            type="number"
            name="dose"
            value={dose}
            InputProps={{
              endAdornment: <InputAdornment position="end">g</InputAdornment>,
            }}
            disabled={lockedField === "dose"}
            onChange={handleChange}
          />
        </Box>
      </Box>
    </Box>
  );
};