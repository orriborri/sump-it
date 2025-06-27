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
import { Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { FormControlProps } from "./formTypes";
import { useRatioCalculation } from "./useRatioCalculation";

interface RatioInputGroupProps extends FormControlProps {
  waterValue: number;
  doseValue: number;
  ratioValue: number | string;
}

export const RatioInputGroup = ({
  control,
  setValue,
  waterValue,
  doseValue,
  ratioValue,
}: RatioInputGroupProps) => {
  const [isRatioLocked, setIsRatioLocked] = useState(true);
  
  const { updateWater, updateDose } = useRatioCalculation({
    water: waterValue,
    dose: doseValue,
    ratio: typeof ratioValue === 'string' ? parseFloat(ratioValue) : ratioValue,
    setValue
  });

  // Get ratio quality description
  const getRatioDescription = (ratio: number): { text: string; color: "success" | "warning" | "error" | "default" } => {
    if (!ratio || ratio === 0) return { text: "Set ratio", color: "default" };
    if (ratio < 12) return { text: "Strong", color: "error" };
    if (ratio < 15) return { text: "Bold", color: "warning" };
    if (ratio >= 15 && ratio <= 18) return { text: "Balanced", color: "success" };
    if (ratio <= 22) return { text: "Bright", color: "warning" };
    return { text: "Weak", color: "error" };
  };
  
  const ratioDesc = getRatioDescription(Number(ratioValue) || 0);

  useEffect(() => {
    if (!isRatioLocked && doseValue && waterValue) {
      setValue("ratio", Number((waterValue / doseValue).toFixed(1)));
    }
  }, [
    isRatioLocked,
    waterValue,
    doseValue,
    setValue,
  ]);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Coffee Parameters
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="water"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    field.onChange(value);
                    updateWater(value);
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
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="dose"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    field.onChange(value);
                    updateDose(value);
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
              
              {Number(ratioValue) > 0 && (
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
                  value={Number(field.value) || 0}
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