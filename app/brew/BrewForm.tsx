"use client";
import { Box, Button, Typography, Rating } from "@mui/material";
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
  too_strong: boolean | null;
  too_weak: boolean | null;
  overall_rating: number | null;
}

export const BrewForm = ({ beans, methods, grinders }: Props) => {
  const router = useRouter();
  const [previousFeedback, setPreviousFeedback] = useState<PreviousFeedback[]>(
    []
  );
  const { control, handleSubmit, watch } = useForm<BrewFormData>({
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
                {feedback.too_strong && " - Too Strong"}
                {feedback.too_weak && " - Too Weak"}
              </Typography>
              {feedback.overall_rating !== null && (
                <Rating value={feedback.overall_rating} readOnly size="small" />
              )}
            </Box>
          ))}
        </Box>
      )}

      <Input control={control} name="water" label="Water (l)" type="number" />
      <Input control={control} name="dose" label="Dose (gr)" type="number" />
      <Input control={control} name="ratio" label="Ratio (g/l)" type="number" />

      <Button type="submit" variant="contained" fullWidth>
        Submit
      </Button>
    </Box>
  );
};
