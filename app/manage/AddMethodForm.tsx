'use client'
import { Box, Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { Input } from "../common/Input";
import { MethodFormData, addMethod } from "./actions";

export const AddMethodForm = () => {
  const { control, handleSubmit, reset } = useForm<MethodFormData>();

  const onSubmit = async (data: MethodFormData) => {
    try {
      await addMethod(data);
      reset();
    } catch (error) {
      console.error("Failed to add method:", error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Input
        control={control}
        name="name"
        label="Method Name"
        rules={{ required: "Method name is required" }}
      />
      <Button type="submit" variant="contained" color="primary">
        Add Method
      </Button>
    </Box>
  );
};
