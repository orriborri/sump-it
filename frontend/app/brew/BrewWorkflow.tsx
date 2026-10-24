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

/**
 * The subset of the typed client this workflow needs.
 *
 * Contract (ticket #170): every method is expected to **resolve** to an
 * `ApiResponse`, never to reject. The production client (`apiFetch` in
 * `lib/trpc/client.ts`) upholds this by catching fetch failures and returning
 * `{ error }`. This workflow nonetheless defends the seam: an adapter, test
 * fake, or future wrapper that rejects (throws) cannot leave the workflow stuck
 * loading or bypass friendly error handling. Rejections are caught, loading and
 * submission state are cleared, and the error is routed through
 * `toFriendlyError`/`UNREACHABLE_MESSAGE` just like a resolved `{ error }`.
 */
export interface BrewClient {
  beans: Pick<typeof coffeeBrewerClient.beans, 'getActive'>;
  grinders: Pick<typeof coffeeBrewerClient.grinders, 'list'>;
  sessions: Pick<typeof coffeeBrewerClient.sessions, 'list' | 'create'>;
}

/** Props for {@link BrewWorkflow}. */
export interface BrewWorkflowProps {
  /** Injected client; defaults to the real typed client. */
  client?: BrewClient;
}

/** Props for {@link WorkflowFooter}. */
interface WorkflowFooterProps {
  /** The zero-based index of the current step. */
  currentStep: number;
  /** Whether the user may advance past the current step. */
  canProceed: boolean;
  /** A save error to surface, if any. */
  saveError: string | null;
  /** Returns to the previous step. */
  onBack: () => void;
  /** Advances to the next step. */
  onNext: () => void;
  /** Saves the completed brew session. */
  onSubmit: () => void;
}

/**
 * The footer region below the stepper: a "complete required fields" hint, any
 * save error, and the Back/Next/Save navigation row.
 */
const WorkflowFooter: React.FC<WorkflowFooterProps> = ({
  currentStep,
  canProceed,
  saveError,
  onBack,
  onNext,
  onSubmit,
}) => (
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

    <StepNavigation
      currentStep={currentStep}
      canProceed={canProceed}
      onBack={onBack}
      onNext={onNext}
      onSubmit={onSubmit}
    />
  </Box>
);

/** Props for {@link StepNavigation}. */
interface StepNavigationProps {
  /** The zero-based index of the current step. */
  currentStep: number;
  /** Whether the user may advance past the current step. */
  canProceed: boolean;
  /** Returns to the previous step. */
  onBack: () => void;
  /** Advances to the next step. */
  onNext: () => void;
  /** Saves the completed brew session. */
  onSubmit: () => void;
}

/**
 * The bottom navigation row for the workflow: Back on the left, and either
 * Next (steps 0-1) or "Save Brew Session" (final step) on the right.
 */
const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  canProceed,
  onBack,
  onNext,
  onSubmit,
}) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={2}
    justifyContent="space-between"
    alignItems="center"
  >
    <Button
      variant="outlined"
      disabled={currentStep === 0}
      onClick={onBack}
      size="large"
      sx={{ minWidth: { xs: '100%', sm: 120 } }}
    >
      Back
    </Button>

    {currentStep < 2 ? (
      <Button
        variant="contained"
        color="primary"
        onClick={onNext}
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
        onClick={onSubmit}
        size="large"
        sx={{ minWidth: { xs: '100%', sm: 120 } }}
      >
        Save Brew Session
      </Button>
    )}
  </Stack>
);

/**
 * The brew-logging workflow: ties equipment selection, parameter entry and
 * feedback into one vertical stepper and saves the brew through the typed
 * client. Pure logic (gating, live ratio, grind clamping, request mapping)
 * lives in `lib/brew/recipe.ts`; this component is the MUI shell that wires it
 * to the stepper.
 */
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
    try {
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
    } catch {
      // Seam defense (ticket #170): the client contract is to resolve
      // `{ error }` rather than reject, but a rejecting adapter must not leave
      // the workflow stuck loading. Surface the friendly unreachable message
      // and fall through to clear `loading` below.
      setLoadError(UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
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

    let response;
    try {
      response = await client.sessions.create(formToSessionRequest(formData));
    } catch (error) {
      // Seam defense (ticket #170): the client contract is to resolve
      // `{ error }` rather than reject, but a rejecting adapter must not bypass
      // friendly error handling. Route the rejection through toFriendlyError
      // exactly like a resolved `{ error }` so the user sees the same message.
      setSaveError(toFriendlyError(error instanceof Error ? error.message : UNREACHABLE_MESSAGE));
      return;
    }

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

          <WorkflowFooter
            currentStep={currentStep}
            canProceed={canProceed}
            saveError={saveError}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
          />
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
