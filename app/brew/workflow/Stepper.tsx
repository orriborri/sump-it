"use client";
import React from "react";
import { 
  Stepper, 
  Step, 
  StepLabel, 
  StepContent,
  Box,
  Typography,
  Paper
} from "@mui/material";

interface FormStepperProps {
  steps: string[];
  activeStep: number;
  children?: React.ReactNode;
}

export const FormStepper: React.FC<FormStepperProps> = ({ 
  steps, 
  activeStep,
  children 
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>
              <Typography 
                variant="h6" 
                fontWeight={activeStep === index ? 600 : 400}
                color={activeStep === index ? 'primary' : 'text.secondary'}
              >
                {label}
              </Typography>
            </StepLabel>
            {activeStep === index && (
              <StepContent>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    mt: 2, 
                    mb: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'primary.light'
                  }}
                >
                  {children}
                </Paper>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};
