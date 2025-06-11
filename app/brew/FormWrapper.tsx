"use client";
import { FormData } from './types';
import { RuntimeType } from "@/app/lib/types";
import type { Beans, Methods, Grinders } from "@/app/lib/db.d";
import { Form } from './Form';

interface FormWrapperProps {
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export default function FormWrapper({ beans, methods, grinders }: FormWrapperProps) {
  const handleSubmit = (data: FormData) => {
    console.log('Form submitted with data:', data);
    // Process the form data, save to database, etc.
  };

  return <Form onSubmit={handleSubmit} />;
}