"use client";
import { Box, Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { Input } from "../common/Input";
import { GrinderFormData, addGrinder } from "./actions";

export const AddGrinderForm = () => {
  const { control, handleSubmit, reset } = useForm<GrinderFormData>();

  const onSubmit = async (data: GrinderFormData) => {
    try {
      await addGrinder(data);
      reset();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to add grinder:", error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Input
        control={control}
        name="name"
        label="Grinder Name"
        rules={{ required: "Grinder name is required" }}
      />
      <Button type="submit" variant="contained" color="primary">
        Add Grinder
      </Button>
    </Box>
  );
};
