"use client";
import { Box, Fade } from '@mui/material';
import { RuntimeType } from "@/app/lib/types";
import type { Beans, Methods, Grinders } from "@/app/lib/db.d";
import { BrewForm } from './BrewForm';
import { BrewFeedback } from './BrewFeedback';
import { useBrewWorkflow } from '../hooks/useBrewWorkflow';
import { ErrorBoundary, BrewErrorFallback } from './ErrorBoundary';

interface BrewWorkflowProps {
  beans: RuntimeType<Beans>[];
  methods: RuntimeType<Methods>[];
  grinders: RuntimeType<Grinders>[];
}

export type { BrewWorkflowProps };

export const BrewWorkflow = ({ beans, methods, grinders }: BrewWorkflowProps) => {
  const { state, actions } = useBrewWorkflow();

  return (
    <ErrorBoundary fallback={BrewErrorFallback}>
      <Fade in={!state.isTransitioning} timeout={300}>
        <Box>
          {state.currentView === 'form' && (
            <BrewForm 
              onSubmit={actions.submitBrew}
              beans={beans} 
              methods={methods} 
              grinders={grinders}
              isLoading={state.isLoading}
              error={state.error}
            />
          )}
          
          {state.currentView === 'feedback' && state.brewData && (
            <BrewFeedback 
              brewData={state.brewData}
              brewId={state.brewId}
              onSaveFeedback={actions.submitFeedback}
              onReset={actions.resetWorkflow}
            />
          )}
        </Box>
      </Fade>
    </ErrorBoundary>
  );
};
