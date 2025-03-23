"use client";

import { Box, Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { Input } from "../common/Input";
import { BeanFormData, addBean } from "./actions";

export const AddBeanForm = () => {
  const { control, handleSubmit, reset } = useForm<BeanFormData>();

  const onSubmit = async (data: BeanFormData) => {
    try {
      await addBean(data);
      reset();
    } catch (error) {
      console.error("Failed to add bean:", error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Input
        control={control}
        name="name"
        label="Bean Name"
        rules={{ required: "Bean name is required" }}
      />
      <Input
        control={control}
        name="roster"
        label="Roaster Name"
        rules={{ required: "Roaster name is required" }}
      />
      <Input
        control={control}
        name="rostery"
        label="Roastery"
        rules={{ required: "Roastery is required" }}
      />
      <Button type="submit" variant="contained" color="primary">
        Add Bean
      </Button>
    </Box>
  );
};
