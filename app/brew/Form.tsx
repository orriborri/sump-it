"use client";
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { FormData } from './types';
import { useForm } from './useForm';
import { Step } from './Step';

interface FormProps {
  onSubmit: (data: FormData) => void;
}

export const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const { formData, currentStep, handleChange, nextStep, prevStep, isLastStep, setFormData } = useForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      onSubmit(formData);
    } else {
      nextStep();
    }
  };

  return (
    <Container maxWidth="md">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Coffee Brewing Form
        </Typography>
        
        <Step 
          currentStep={currentStep} 
          formData={formData} 
          handleChange={handleChange}
          nextStep={nextStep}
          prevStep={prevStep}
          isLastStep={isLastStep}
          setFormData={setFormData}
        />
      </Box>
    </Container>
  );
};

