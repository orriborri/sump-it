"use client";
import { Step, StepLabel, Stepper } from "@mui/material";

interface FormStepperProps {
  steps: string[];
  activeStep: number;
}

export const FormStepper = ({ steps, activeStep }: FormStepperProps) => {
  return (
    <Stepper activeStep={activeStep} alternativeLabel>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};
