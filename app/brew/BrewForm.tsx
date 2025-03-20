"use client";
import { Box, Button, Typography, Rating, IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useForm } from "react-hook-form";
import type { Beans, Grinders, Methods } from "../lib/db";
import type { RuntimeType } from "../lib/types";
import type { BrewFormData } from "./types";
import { Select } from "../common/Select";
import { Input } from "../common/Input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getPreviousBrewFeedback, createBrew } from "./actions";

interface Props {
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

interface PreviousFeedback {
  grind: number;
  ratio: number | null;
  too_strong: boolean | null;
  too_weak: boolean | null;
  is_sour: boolean | null;
  is_bitter: boolean | null;
  overall_rating: number | null;
}

export const BrewForm = ({ beans, methods, grinders }: Props) => {
  const router = useRouter();
  const [previousFeedback, setPreviousFeedback] = useState<PreviousFeedback[]>(
    []
  );
  const [isRatioLocked, setIsRatioLocked] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<"water" | "dose" | null>(null);

  const { control, handleSubmit, watch, setValue } = useForm<BrewFormData>({
    defaultValues: {
      bean_id: 0,
      method_id: 0,
      grinder_id: 0,
      grind: 0,
      water: 0,
      dose: 0,
      ratio: 0,
    },
  });

  const selectedBeanId = watch("bean_id");
  const selectedMethodId = watch("method_id");
  const waterValue = watch("water");
  const doseValue = watch("dose");
  const ratioValue = watch("ratio");

  // Handle water changes
  const onWaterChange = (value: number) => {
    setValue("water", value);
    setLastUpdated("water");
  };

  // Handle dose changes
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

  useEffect(() => {
    const fetchPreviousFeedback = async () => {
      if (selectedBeanId && selectedMethodId) {
        const feedback = await getPreviousBrewFeedback(
          selectedBeanId,
          selectedMethodId
        );
        setPreviousFeedback(
          feedback.filter((f): f is PreviousFeedback => f.grind !== null)
        );
      }
    };

    fetchPreviousFeedback();
  }, [selectedBeanId, selectedMethodId]);

  const onSubmit = handleSubmit(async (data) => {
    const id = await createBrew(data);
    router.push(`/brew/${id}`);
  });

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ maxWidth: 599, margin: "0 auto", padding: 2 }}
    >
      <Select
        control={control}
        name="method_id"
        label="Brewer"
        items={methods}
        getKey={(method: RuntimeType<Methods>) => method.id}
        getValue={(method: RuntimeType<Methods>) => method.id.toString()}
        getLabel={(method: RuntimeType<Methods>) => method.name}
      />
      <Select
        control={control}
        name="bean_id"
        label="Beans"
        items={beans}
        getKey={(bean: RuntimeType<Beans>) => bean.id}
        getValue={(bean: RuntimeType<Beans>) => bean.id.toString()}
        getLabel={(bean: RuntimeType<Beans>) => bean.name ?? ""}
      />
      <Select
        control={control}
        name="grinder_id"
        label="Grinder"
        items={grinders}
        getKey={(grinder: RuntimeType<Grinders>) => grinder.id}
        getValue={(grinder: RuntimeType<Grinders>) => grinder.id.toString()}
        getLabel={(grinder: RuntimeType<Grinders>) => grinder.name ?? ""}
      />
      <Input
        control={control}
        name="grind"
        label="Grind setting"
        type="number"
      />

      {previousFeedback.length > 0 && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Previous Brews Feedback:
          </Typography>
          {previousFeedback.map((feedback, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Grind: {feedback.grind}
                {feedback.ratio && ` - Ratio: ${feedback.ratio}`}
                {feedback.too_strong && " - Too Strong"}
                {feedback.too_weak && " - Too Weak"}
                {feedback.is_sour && " - Sour"}
                {feedback.is_bitter && " - Bitter"}
              </Typography>
              {feedback.overall_rating !== null && (
                <Rating value={feedback.overall_rating} readOnly size="small" />
              )}
            </Box>
          ))}
        </Box>
      )}

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

      <Button type="submit" variant="contained" fullWidth>
        Submit
      </Button>
    </Box>
  );
};
