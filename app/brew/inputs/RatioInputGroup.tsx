import { Box, IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Input } from "../../common/Input";
import { Control, UseFormSetValue } from "react-hook-form";
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
  const [isRatioLocked, setIsRatioLocked] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<"water" | "dose" | null>(null);

  const onWaterChange = (value: number) => {
    setValue("water", value);
    setLastUpdated("water");
  };
  
  const onDoseChange = (value: number) => {
    setValue("dose", value);
    setLastUpdated("dose");
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
    <Box sx={{ display: "flex", flexDirection: "row", gap: 2, mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Input
          control={control}
          name="water"
          label="Water (ml)"
          type="number"
          onChange={onWaterChange}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Input
          control={control}
          name="dose"
          label="Dose (g)"
          type="number"
          onChange={onDoseChange}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Input
          control={control}
          name="ratio"
          label="Ratio"
          type="number"
          disabled={isRatioLocked}
        />
        <IconButton
          onClick={() => setIsRatioLocked(!isRatioLocked)}
          sx={{ mt: -1 }}
        >
          {isRatioLocked ? <LockIcon /> : <LockOpenIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};
