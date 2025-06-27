"use client";
import { useState } from "react";
import { FormData } from "./types";

// Constants moved to the top for better readability
const INITIAL_WATER = 250;
const INITIAL_DOSE = 15;
const INITIAL_RATIO = 16.67;
const INITIAL_GRIND = 20;

export interface UseFormReturn {
  formData: FormData;
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<FormData>) => void;
}

export const useForm = (): UseFormReturn => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    bean_id: 0,
    method_id: 0,
    grinder_id: 0,
    water: INITIAL_WATER,
    dose: INITIAL_DOSE,
    ratio: INITIAL_RATIO,
    grind: INITIAL_GRIND,
  });

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  return {
    formData,
    currentStep,
    nextStep,
    prevStep,
    updateFormData,
  };
};
