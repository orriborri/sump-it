"use client";
import { useState } from 'react';
import { FormData } from './types';
import { SelectChangeEvent } from '@mui/material';

export const useForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    bean_id: '',
    method_id: '',
    grinder_id: '',
    water: 250,
    dose: 15,
    ratio: 16.67,
    grind: 20,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const isLastStep = currentStep === 2; // Now three steps: 0, 1, and 2

  return {
    formData,
    currentStep,
    handleChange,
    nextStep,
    prevStep,
    isLastStep,
    setFormData,
  };
};