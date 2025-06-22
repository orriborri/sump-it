import { 
  Box, 
  IconButton, 
  Typography, 
  Grid, 
  Paper, 
  Slider,
  InputAdornment,
  TextField,
  Tooltip,
  Chip
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import ScaleIcon from "@mui/icons-material/Scale";
import { Input } from "../common/Input";
import { Control, UseFormSetValue, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import type { BrewFormData } from "../types";

interface Props {
  control: Control<BrewFormData>;
  setValue: UseFormSetValue<BrewFormData>;
  waterValue: number;
  doseValue: number;
  ratioValue: number;
}

export const RatioInputGroup = ({
  control,
  setValue,
  waterValue,
  doseValue,
  ratioValue,
}: Props) => {
  const [isRatioLocked, setIsRatioLocked] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<"water" | "dose" | null>(null);

  const onWaterChange = (value: number) => {
    setValue("water", value);
    setLastUpdated("water");
  };
  
  const onDoseChange = (value: number) => {
    setValue("dose", value);
    setLastUpdated("dose");
  };

  // Get ratio quality description
  const getRatioDescription = (ratio: number): { text: string; color: "success" | "warning" | "error" | "default" } => {
    if (!ratio || ratio === 0) return { text: "Set ratio", color: "default" };
    if (ratio < 12) return { text: "Strong", color: "error" };
    if (ratio < 15) return { text: "Bold", color: "warning" };
    if (ratio >= 15 && ratio <= 18) return { text: "Balanced", color: "success" };
    if (ratio <= 22) return { text: "Bright", color: "warning" };
    return { text: "Weak", color: "error" };
  };

  useEffect(() => {
    if (isRatioLocked) {
      if (lastUpdated === "water" && waterValue && ratioValue) {
        const newDose = Number((waterValue / ratioValue).toFixed(1));
        setValue("dose", newDose);
      } else if (lastUpdated === "dose" && doseValue && ratioValue) {
        const newWater = Number((doseValue * ratioValue).toFixed(1));
        setValue("water", newWater);
      }
    } else if (doseValue && waterValue) {
      setValue("ratio", Number((waterValue / doseValue).toFixed(1)));
    }
  }, [
    isRatioLocked,
    waterValue,
    doseValue,
    ratioValue,
    lastUpdated,
    setValue,
  ]);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Coffee Parameters
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Controller
              name="water"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    field.onChange(value);
                    onWaterChange(value);
                  }}
                  fullWidth
                  label="Water"
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WaterDropIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">ml</InputAdornment>,
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Controller
              name="dose"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    field.onChange(value);
                    onDoseChange(value);
                  }}
                  fullWidth
                  label="Coffee"
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ScaleIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">g</InputAdornment>,
                  }}
                />
              )}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              Coffee-to-Water Ratio
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={isRatioLocked ? "Ratio is locked. Changing water or coffee will maintain this ratio" : "Ratio will change based on water and coffee values"}>
                <IconButton
                  onClick={() => setIsRatioLocked(!isRatioLocked)}
                  color={isRatioLocked ? "primary" : "default"}
                  size="small"
                >
                  {isRatioLocked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
              </Tooltip>
              
              {ratioValue > 0 && (
                <Chip 
                  label={ratioDesc.text} 
                  color={ratioDesc.color} 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{ mr: 1, minWidth: '30px' }}>1:</Typography>
            
            <Controller
              name="ratio"
              control={control}
              render={({ field }) => (
                <Slider
                  {...field}
                  onChange={(_, value) => {
                    field.onChange(value);
                    // When ratio slider changes, update water based on current dose
                    if (doseValue && isRatioLocked) {
                      setValue("water", Math.round(doseValue * (value as number)));
                    }
                  }}
                  disabled={!isRatioLocked}
                  min={10}
                  max={24}
                  step={0.5}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 15, label: '15' },
                    { value: 18, label: '18' },
                    { value: 24, label: '24' }
                  ]}
                  valueLabelDisplay="on"
                />
              )}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Strong</Typography>
            <Typography variant="caption" color="text.secondary">Balanced</Typography>
            <Typography variant="caption" color="text.secondary">Weak</Typography>
          </Box>
        </Box>
        
        {doseValue > 0 && waterValue > 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            {doseValue}g of coffee with {waterValue}ml of water = 1:{(waterValue / doseValue).toFixed(1)} ratio
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
