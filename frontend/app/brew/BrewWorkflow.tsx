// Brew-logging workflow (ticket #145): the core flow that ties equipment
// selection, parameter entry and feedback into one vertical stepper and saves
// the brew through the typed client.
//
// Data flows through the injected typed client (`coffeeBrewerClient`), so tests
// supply a fake with no network. All pure logic (gating, live ratio, grind
// clamping, request mapping) lives in `lib/brew/recipe.ts`; this component is a
// thin shell that wires it to MUI and the stepper.
//
// The coffee theme (#8B4513 brown, #4CAF50 green) and the single-column
// vertical layout are preserved from the original sump-it page.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';

import { coffeeBrewerClient } from '@/lib/trpc/client';
import type { BrewingSession, CoffeeBean, Grinder } from '@/lib/api/types';
import {
  areParametersComplete,
  emptyBrewForm,
  formToSessionRequest,
  isEquipmentComplete,
  toFriendlyError,
  UNREACHABLE_MESSAGE,
  type BrewFormData,
} from '@/lib/brew/recipe';

import { IntegratedVerticalStepper } from './IntegratedVerticalStepper';
import { BeanSelector } from './BeanSelector';
import { BrewingParameters } from './BrewingParameters';
import { BrewFeedback } from './BrewFeedback';

/** The subset of the typed client this workflow needs. */
export interface BrewClient {
  beans: Pick<typeof coffeeBrewerClient.beans, 'getActive'>;
  grinders: Pick<typeof coffeeBrewerClient.grinders, 'list'>;
  sessions: Pick<typeof coffeeBrewerClient.sessions, 'list' | 'create'>;
}

export interface BrewWorkflowProps {
  /** Injected client; defaults to the real typed client. */
  client?: BrewClient;
}

export function BrewWorkflow({ client = coffeeBrewerClient }: BrewWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BrewFormData>(emptyBrewForm());

  const [beans, setBeans] = useState<CoffeeBean[]>([]);
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [previousSessions, setPreviousSessions] = useState<BrewingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [beansRes, grindersRes, sessionsRes] = await Promise.all([
      client.beans.getActive(),
      client.grinders.list(),
      client.sessions.list({ limit: 5 }),
    ]);

    const firstError = beansRes.error ?? grindersRes.error ?? sessionsRes.error;
    if (firstError) {
      // If the very first data load fails, the backend is effectively
      // unreachable from the user's point of view; show a friendly message
      // rather than a raw fetch error like "Failed to fetch".
      setLoadError(UNREACHABLE_MESSAGE);
    } else {
      setLoadError(null);
    }
    setBeans(beansRes.data ?? []);
    setGrinders(grindersRes.data?.items ?? []);
    setPreviousSessions(sessionsRes.data?.items ?? []);
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateFormData = (updates: Partial<BrewFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const selectedGrinder = grinders.find((g) => g.id === formData.grinderId);

  const equipmentReady = isEquipmentComplete(formData);
  const parametersReady = areParametersComplete(formData);
  const canProceed = currentStep === 0 ? equipmentReady : currentStep === 1 ? parametersReady : true;

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((step) => step + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const resetForm = () => {
    setFormData(emptyBrewForm());
    setCurrentStep(0);
  };

  const handleSubmit = async () => {
    setSaveError(null);

    const response = await client.sessions.create(formToSessionRequest(formData));
    if (response.error) {
      // Business errors (insufficient quantity, recipe violations) are already
      // actionable; a bare network failure becomes the friendly unreachable
      // message via toFriendlyError.
      setSaveError(toFriendlyError(response.error));
      return;
    }

    setSavedMessage('Brewing session saved.');
    resetForm();
    void loadData();
  };

  const steps = ['Equipment Selection', 'Brewing Parameters', 'Brew & Rate'];

  const stepConfig = [
    {
      title: 'Select your coffee and brewing equipment',
      description: 'Choose the coffee beans, brewing method, and grinder for your brew.',
      content: (
        <BeanSelector
          formData={formData}
          updateFormData={updateFormData}
          beans={beans}
          grinders={grinders}
          isLoading={loading}
        />
      ),
    },
    {
      title: 'Configure your brewing parameters',
      description: 'Set coffee amount, water, and grind setting. The coffee ratio updates live.',
      content: (
        <BrewingParameters
          formData={formData}
          updateFormData={updateFormData}
          previousSessions={previousSessions}
          isLoading={loading}
          selectedGrinder={selectedGrinder}
        />
      ),
    },
    {
      title: 'Brew your coffee and rate the results',
      description: 'Record a rating, tasting notes, feedback and suggestions, then save.',
      content: (
        <BrewFeedback formData={formData} updateFormData={updateFormData} onSubmit={handleSubmit} />
      ),
    },
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#8B4513', fontWeight: 600 }}>
          Coffee Brewing Tracker
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Track and improve your coffee brewing with this 3-step workflow.
        </Typography>

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, mt: 3, minHeight: '70vh' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 4, color: '#8B4513', fontWeight: 600 }}>
            Brewing Steps
          </Typography>

          <IntegratedVerticalStepper
            steps={steps}
            activeStep={currentStep}
            getStepInstructions={(index) => stepConfig[index]}
            getStepContent={(index) => stepConfig[index].content}
          />

          <Box sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            {!canProceed && currentStep < 2 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please complete all required fields before proceeding.
              </Alert>
            )}

            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
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
                disabled={currentStep === 0}
                onClick={handleBack}
                size="large"
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
              >
                Back
              </Button>

              {currentStep < 2 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  disabled={!canProceed}
                  size="large"
                  sx={{ minWidth: { xs: '100%', sm: 120 } }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmit}
                  size="large"
                  sx={{ minWidth: { xs: '100%', sm: 120 } }}
                >
                  Save Brew Session
                </Button>
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={savedMessage !== null}
        autoHideDuration={4000}
        onClose={() => setSavedMessage(null)}
        message={savedMessage ?? ''}
      />
    </Container>
  );
}
