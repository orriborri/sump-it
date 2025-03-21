import { Box, IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Input } from "../common/Input";
import { Control, UseFormSetValue } from "react-hook-form";
import { useState, useEffect } from "react";
import type { BrewFormData } from "./types";

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
    if (!isRatioLocked) {
      // When ratio is not locked, just calculate ratio from water and dose
      if (waterValue && doseValue) {
        const calculatedRatio = Number((waterValue / doseValue).toFixed(2));
        setValue("ratio", calculatedRatio);
      }
    } else if (ratioValue) {
      // When ratio is locked, update the other value based on what changed last
      if (lastUpdated === "water" && waterValue) {
        const calculatedDose = Number((waterValue / ratioValue).toFixed(2));
        setValue("dose", calculatedDose);
      } else if (lastUpdated === "dose" && doseValue) {
        const calculatedWater = Number((doseValue * ratioValue).toFixed(2));
        setValue("water", calculatedWater);
      }
    }
  }, [waterValue, doseValue, ratioValue, isRatioLocked, lastUpdated, setValue]);

  return (
    <>
      <Input
        control={control}
        name="water"
        label="Water (ml)"
        type="number"
        onChange={onWaterChange}
      />
      <Input
        control={control}
        name="dose"
        label="Dose (gr)"
        type="number"
        onChange={onDoseChange}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Input
          control={control}
          name="ratio"
          label="Ratio (ml/g)"
          type="number"
          disabled={!isRatioLocked}
        />
        <IconButton
          onClick={() => setIsRatioLocked(!isRatioLocked)}
          color={isRatioLocked ? "primary" : "default"}
          sx={{ mt: -1 }}
        >
          {isRatioLocked ? <LockIcon /> : <LockOpenIcon />}
        </IconButton>
      </Box>
    </>
  );
};
