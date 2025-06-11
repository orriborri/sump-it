"use client";
import React from 'react';
import { Box, Button, Typography, Stack, SelectChangeEvent } from '@mui/material';
import { StepProps } from './types';
import { SelectionInputsSimple } from './inputs/SelectionInputsSimple';
import { WaterDoseInputGroup } from './WaterDoseInputGroup';
import { GrindSettingInput } from './inputs/GrindSettingInput';
import { FormStepper } from './Stepper';

export const Step: React.FC<StepProps> = ({
  currentStep,
  formData,
  handleChange,
  nextStep,
  prevStep,
  isLastStep,
  setFormData
}) => {
  const steps = ['Select Bean & Brew','Grind Setting', 'Water Dosing', ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Selection step - Bean & Brew
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select your coffee and brewing method
            </Typography>
            <SelectionInputsSimple 
              formData={formData} 
              handleChange={handleChange} 
            />
          </Box>
        );
         case 1:
        // Grind Setting step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Set grind setting
            </Typography>
            <GrindSettingInput
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
            />
          </Box>
        );
      case 2:
        // Water Dosing step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Set water & coffee dose
            </Typography>
            <WaterDoseInputGroup 
              control={{
                control: {
                  register: () => ({}),
                },
                setValue: (name: string, value: any) => {
                  setFormData({ ...formData, [name]: value });
                },
              }}
              watch={(name: string) => formData[name as keyof typeof formData]}
              setValue={(name: string, value: any) => {
                setFormData({ ...formData, [name]: value });
              }}
            />
          </Box>
        );
     
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <FormStepper steps={steps} activeStep={currentStep} />
      
      <Box sx={{ mt: 4, mb: 4 }}>
        {renderStepContent()}
      </Box>
      
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          disabled={currentStep === 0}
          onClick={prevStep}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={isLastStep ? undefined : nextStep}
          type={isLastStep ? "submit" : "button"}
        >
          {isLastStep ? 'Submit' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
};

export default Step;