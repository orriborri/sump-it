"use client";
import { Box, Button } from "@mui/material";
import { useForm } from "react-hook-form";
import type { Beans, Grinders, Methods } from "../lib/db";
import type { RuntimeType } from "../lib/types";
import type { BrewFormData, PreviousFeedback } from "./types";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getPreviousBrewFeedback, createBrew } from "./actions";
import { PreviousFeedbackList } from "./PreviousFeedbackList";
import { RatioInputGroup } from "./RatioInputGroup";
import { SelectionInputs } from "./SelectionInputs";

interface Props {
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export const BrewForm = ({ beans, methods, grinders }: Props) => {
  const router = useRouter();
  const [previousFeedback, setPreviousFeedback] = useState<PreviousFeedback[]>(
    []
  );
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<number | null>(null);

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

  // Auto-select single options
  useEffect(() => {
    if (beans.length === 1) {
      setValue("bean_id", beans[0].id);
    }
    if (methods.length === 1) {
      setValue("method_id", methods[0].id);
    }
    if (grinders.length === 1) {
      setValue("grinder_id", grinders[0].id);
    }
  }, [beans, methods, grinders, setValue]);

  const selectedBeanId = watch("bean_id");
  const selectedMethodId = watch("method_id");
  const waterValue = watch("water");
  const doseValue = watch("dose");
  const ratioValue = watch("ratio");

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

  const handleUseAsFeedback = (feedback: PreviousFeedback) => {
    setValue("grind", feedback.grind);
    if (feedback.ratio) {
      setValue("ratio", feedback.ratio);
    }
    setSelectedFeedbackId(feedback.id);
  };

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      }}
      sx={{ maxWidth: 599, margin: "0 auto", padding: 2 }}
    >
      <SelectionInputs
        control={control}
        beans={beans}
        methods={methods}
        grinders={grinders}
      />

      <PreviousFeedbackList
        feedback={previousFeedback}
        onUseAsFeedback={handleUseAsFeedback}
        selectedFeedbackId={selectedFeedbackId}
      />

      <RatioInputGroup
        control={control}
        setValue={setValue}
        waterValue={waterValue}
        doseValue={doseValue}
        ratioValue={ratioValue}
      />

      <Button type="submit" variant="contained" fullWidth>
        Submit
      </Button>
    </Box>
  );
};
