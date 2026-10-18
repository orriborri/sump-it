// Main brewing page with vertical stepper
// From sump-it: 3-step brewing workflow
'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Paper,
  Alert,
  Container,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { IntegratedVerticalStepper, useStepNavigation } from './IntegratedVerticalStepper';
import { BeanSelector } from './BeanSelector';
import { BrewingParameters } from './BrewingParameters';
import { BrewFeedback } from './BrewFeedback';
import { coffeeBrewerClient } from '@/lib/trpc/client';
import type { BrewingMethod, CreateBrewingSessionRequest } from '@/lib/api/types';

// Form state interface
interface BrewFormData {
  // Step 1: Equipment Selection
  beanId: string;
  grinderId: string;
  brewingMethod: string;
  
  // Step 2: Brewing Parameters
  coffeeGrams: number;
  waterGrams: number;
  grindSetting: number;
  waterTempCelsius?: number;
  brewTimeSeconds?: number;
  
  // Step 3: Brew & Rate
  rating?: number;
  tastingNotes?: string;
  feedback?: string;
  suggestions?: string;
}

export default function BrewPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BrewFormData>({
    beanId: '',
    grinderId: '',
    brewingMethod: '',
    coffeeGrams: 20,
    waterGrams: 320,
    grindSetting: 20,
  });

  // Fetch data for selectors
  const { data: beans, isLoading: isLoadingBeans } = useQuery({
    queryKey: ['beans', 'active'],
    queryFn: async () => {
      const response = await coffeeBrewerClient.beans.getActive();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
  });

  const { data: grinders, isLoading: isLoadingGrinders } = useQuery({
    queryKey: ['grinders'],
    queryFn: async () => {
      const response = await coffeeBrewerClient.grinders.list();
      if (response.error) throw new Error(response.error);
      return response.data?.items || [];
    },
  });

  const { data: previousSessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['sessions', 'recent'],
    queryFn: async () => {
      const response = await coffeeBrewerClient.sessions.list({ limit: 5 });
      if (response.error) throw new Error(response.error);
      return response.data?.items || [];
    },
  });

  // Step configuration
  const stepConfig = [
    {
      label: 'Equipment Selection',
      title: 'Select your coffee and brewing equipment',
      description: 'Choose the coffee beans, brewing method, and grinder for your brew.',
      content: (
        <BeanSelector
          formData={formData}
          updateFormData={updateFormData}
          beans={beans || []}
          grinders={grinders || []}
          isLoading={isLoadingBeans || isLoadingGrinders}
        />
      ),
    },
    {
      label: 'Brewing Parameters',
      title: 'Configure your brewing parameters',
      description: 'Set coffee amount, grind setting, and ratio based on previous brew feedback.',
      content: (
        <BrewingParameters
          formData={formData}
          updateFormData={updateFormData}
          previousSessions={previousSessions || []}
          isLoading={isLoadingSessions}
        />
      ),
    },
    {
      label: 'Brew & Rate',
      title: 'Brew your coffee and rate the results',
      description: 'Start brewing and provide feedback to improve future brews.',
      content: (
        <BrewFeedback
          formData={formData}
          updateFormData={updateFormData}
          onSubmit={handleSubmit}
        />
      ),
    },
  ];

  const steps = stepConfig.map(step => step.label);
  const navigation = useStepNavigation(currentStep, formData, steps.length);

  // Update form data
  function updateFormData(updates: Partial<BrewFormData>) {
    setFormData(prev => ({ ...prev, ...updates }));
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Submit brewing session
  async function handleSubmit() {
    try {
      // Convert form data to the generated API request type. The form keeps
      // brewingMethod as a plain string for the select; narrow it to the
      // generated BrewingMethod union here. Optional fields map to `null` to
      // match the Rust `Option<T>` serialization.
      const sessionData: CreateBrewingSessionRequest = {
        beanId: formData.beanId,
        grinderId: formData.grinderId,
        brewingMethod: formData.brewingMethod as BrewingMethod,
        grindSetting: formData.grindSetting,
        waterTempCelsius: formData.waterTempCelsius ?? null,
        brewTimeSeconds: formData.brewTimeSeconds ?? null,
        coffeeGrams: formData.coffeeGrams,
        waterGrams: formData.waterGrams,
        rating: formData.rating ?? null,
        tastingNotes: formData.tastingNotes ?? null,
        feedback: formData.feedback ?? null,
        suggestions: formData.suggestions ?? null,
        isTemplate: false,
      };

      // Submit to API
      const response = await coffeeBrewerClient.sessions.create(sessionData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Show success message and reset form
      alert('Brewing session saved successfully!');
      resetForm();
      
    } catch (error) {
      console.error('Failed to submit brewing session:', error);
      alert(`Failed to save brewing session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Reset form after successful submission
  function resetForm() {
    setFormData({
      beanId: '',
      grinderId: '',
      brewingMethod: '',
      coffeeGrams: 20,
      waterGrams: 320,
      grindSetting: 20,
    });
    setCurrentStep(0);
  }

  const getStepInstructions = (stepIndex: number) => stepConfig[stepIndex];
  const getStepContent = (stepIndex: number) => stepConfig[stepIndex]?.content || null;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#8B4513', fontWeight: 600 }}>
          Coffee Brewing Tracker
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Track and improve your coffee brewing with this comprehensive 3-step workflow.
          Follow the steps below to create a perfect brew every time.
        </Typography>

        <Paper
          elevation={1}
          sx={{
            p: { xs: 3, sm: 4 },
            bgcolor: 'background.paper',
            mt: 3,
            minHeight: '70vh',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            Brewing Steps
          </Typography>

          {/* Integrated Vertical Stepper */}
          <IntegratedVerticalStepper
            steps={steps}
            activeStep={currentStep}
            getStepInstructions={getStepInstructions}
            getStepContent={getStepContent}
          />

          {/* Navigation Buttons */}
          <Box sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            {!navigation.canProceedToNext && currentStep < 2 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please complete all required fields before proceeding.
              </Alert>
            )}
            
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Button
                variant="outlined"
                disabled={!navigation.canGoBack}
                onClick={handleBack}
                size="large"
                sx={{
                  minWidth: { xs: '100%', sm: 120 },
                  order: { xs: 2, sm: 1 }
                }}
              >
                Back
              </Button>

              <Box sx={{
                display: { xs: 'block', sm: 'none' },
                textAlign: 'center',
                order: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  {steps[currentStep]}
                </Typography>
              </Box>

              {!navigation.isLastStep ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  type="button"
                  size="large"
                  disabled={!navigation.canProceedToNext}
                  sx={{
                    minWidth: { xs: '100%', sm: 120 },
                    order: { xs: 1, sm: 2 }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmit}
                  type="button"
                  size="large"
                  sx={{
                    minWidth: { xs: '100%', sm: 120 },
                    order: { xs: 1, sm: 2 }
                  }}
                >
                  Save Brew Session
                </Button>
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}