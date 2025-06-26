"use client";
import React from "react";
import { Container, Box } from "@mui/material";
import { FormData } from "./types";
import { useForm } from "./useForm";
import { Step } from "./Step";
import { RuntimeType } from "@/app/lib/types";
import type { Beans, Methods, Grinders } from "@/app/lib/db.d";

interface FormProps {
  onSubmit: (data: FormData) => void;
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export const Form: React.FC<FormProps> = ({
  onSubmit,
  beans,
  methods,
  grinders,
}) => {
  const form = useForm();
  const handleSubmit = () => {
    onSubmit(form.formData);
  };
  return (
    <Container maxWidth="md">
      <Box component="div" sx={{ mt: 3 }}>
        <Step form={form} onSubmit={handleSubmit} beans={beans} methods={methods} grinders={grinders} />
      </Box>
    </Container>
  );
};
