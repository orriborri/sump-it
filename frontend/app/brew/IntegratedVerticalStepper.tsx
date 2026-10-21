// Integrated Vertical Stepper Component
// From sump-it: Unique 3-step brewing workflow with integrated forms
'use client';

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Collapse,
} from '@mui/material';
import { Check } from '@mui/icons-material';

/** Describes a single step: its label, instruction text and form content. */
interface StepConfig {
  label: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

/** Props for the integrated vertical stepper. */
interface IntegratedVerticalStepperProps {
  steps: string[];
  activeStep: number;
  getStepInstructions: (stepIndex: number) => { title: string; description: string };
  getStepContent: (stepIndex: number) => React.ReactNode;
}

/** Props shared by the per-step presentational sub-components. */
interface StepStateProps {
  isActive: boolean;
  isCompleted: boolean;
}

/**
 * Renders the numbered circle for a step, showing a check when the step is
 * completed and the one-based step number otherwise.
 *
 * @param props - The indicator props.
 * @param props.index - The zero-based step index.
 * @param props.isActive - Whether this is the current step.
 * @param props.isCompleted - Whether this step is already completed.
 * @returns The rendered step indicator.
 */
const StepIndicator: React.FC<StepStateProps & { index: number }> = ({
  index,
  isActive,
  isCompleted,
}) => (
  <Box
    sx={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: isCompleted
        ? 'success.main'
        : isActive
          ? 'primary.main'
          : 'grey.500',
      color: 'white',
      transition: 'all 0.3s ease',
      flexShrink: 0,
      mt: 1,
      boxShadow: isActive ? 2 : 1,
    }}
  >
    {isCompleted ? (
      <Check sx={{ fontSize: 20 }} />
    ) : (
      <Typography variant="body1" fontWeight="bold">
        {index + 1}
      </Typography>
    )}
  </Box>
);

/**
 * Renders the step label and its status chip (current or completed), which is
 * only shown for the active or completed step.
 *
 * @param props - The header props.
 * @param props.label - The step label text.
 * @param props.isActive - Whether this is the current step.
 * @param props.isCompleted - Whether this step is already completed.
 * @returns The rendered step header.
 */
const StepHeader: React.FC<StepStateProps & { label: string }> = ({
  label,
  isActive,
  isCompleted,
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography
      variant="h6"
      fontWeight={isActive ? 600 : 500}
      color={
        isCompleted
          ? 'success.main'
          : isActive
            ? 'primary.main'
            : 'text.secondary'
      }
      sx={{
        lineHeight: 1.3,
        transition: 'all 0.3s ease',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>

    {/* Status Chip */}
    {isActive && (
      <Chip
        label="Current Step"
        size="small"
        color="primary"
        sx={{
          height: 22,
          fontSize: '0.7rem',
          mb: 1,
          '& .MuiChip-label': {
            px: 1.5,
          }
        }}
      />
    )}
    {isCompleted && (
      <Chip
        label="Completed"
        size="small"
        color="success"
        sx={{
          height: 22,
          fontSize: '0.7rem',
          mb: 1,
          '& .MuiChip-label': {
            px: 1.5,
          }
        }}
      />
    )}
  </Box>
);

/**
 * Renders the active step's instruction panel with its title and description.
 *
 * @param props - The instructions props.
 * @param props.title - The instruction title.
 * @param props.description - The instruction description.
 * @returns The rendered instruction panel.
 */
const StepInstructions: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      mb: 3,
      bgcolor: '#FFFFFF',
      border: 1,
      borderColor: '#8B4513',
      borderRadius: 2,
    }}
  >
    <Typography
      variant="subtitle1"
      color="#2C1810"
      fontWeight={600}
      gutterBottom
    >
      {title}
    </Typography>

    <Typography
      variant="body2"
      color="#3C2415"
      sx={{ lineHeight: 1.6, fontSize: '0.95rem' }}
    >
      {description}
    </Typography>
  </Paper>
);

/**
 * Renders the collapsible panel that holds the active step's form content.
 *
 * @param props - The content-panel props.
 * @param props.isActive - Whether this is the current step (controls expansion).
 * @param props.children - The step's form content, rendered only when active.
 * @returns The rendered content panel.
 */
const StepContentPanel: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({
  isActive,
  children,
}) => (
  <Collapse in={isActive} timeout={300}>
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: 'background.default',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {isActive && children}
    </Paper>
  </Collapse>
);

/**
 * Renders the italic summary line shown beneath a completed step.
 *
 * @param props - The summary props.
 * @param props.title - The step instruction title used as the summary text.
 * @returns The rendered completed-step summary.
 */
const CompletedSummary: React.FC<{ title: string }> = ({ title }) => (
  <Typography
    variant="body2"
    color="success.main"
    sx={{
      fontStyle: 'italic',
      mt: 1,
    }}
  >
    ✓ {title}
  </Typography>
);

/** Props for a single rendered step row. */
interface StepRowProps extends StepStateProps {
  index: number;
  label: string;
  instructions: { title: string; description: string };
  content: React.ReactNode;
}

/**
 * Renders one step row: the numbered indicator alongside the step header,
 * instructions, collapsible form content and completed summary.
 *
 * @param props - The step-row props.
 * @param props.index - The zero-based step index.
 * @param props.label - The step label text.
 * @param props.isActive - Whether this is the current step.
 * @param props.isCompleted - Whether this step is already completed.
 * @param props.instructions - The title and description for the step.
 * @param props.content - The step's form content.
 * @returns The rendered step row.
 */
const StepRow: React.FC<StepRowProps> = ({
  index,
  label,
  isActive,
  isCompleted,
  instructions,
  content,
}) => (
  <Stack direction="row" spacing={2} alignItems="flex-start">
    {/* Step Number/Icon */}
    <StepIndicator index={index} isActive={isActive} isCompleted={isCompleted} />

    {/* Step Content */}
    <Box sx={{ flex: 1, pb: 4 }}>
      {/* Step Header */}
      <StepHeader label={label} isActive={isActive} isCompleted={isCompleted} />

      {/* Step Instructions - Always visible for active step */}
      {isActive && (
        <StepInstructions title={instructions.title} description={instructions.description} />
      )}

      {/* Step Form Content - Only for active step */}
      <StepContentPanel isActive={isActive}>{content}</StepContentPanel>

      {/* Completed step summary */}
      {isCompleted && <CompletedSummary title={instructions.title} />}
    </Box>
  </Stack>
);

/**
 * Renders the vertical connector line drawn between step rows, colored by the
 * step's completion or active state.
 *
 * @param props - The connector props.
 * @param props.isActive - Whether the preceding step is the current step.
 * @param props.isCompleted - Whether the preceding step is completed.
 * @returns The rendered connector line.
 */
const StepConnector: React.FC<StepStateProps> = ({ isActive, isCompleted }) => (
  <Box
    sx={{
      width: 3,
      height: 32,
      bgcolor: isCompleted ? 'success.main' : isActive ? 'primary.main' : 'grey.300',
      ml: 2.25,
      transition: 'all 0.3s ease',
    }}
  />
);

/**
 * Renders the brewing workflow as a vertical stepper, marking completed and
 * active steps and showing the active step's instructions and form content
 * inline. Presentational only: the parent owns the active-step state and
 * supplies instructions and content per step.
 *
 * @param props - The stepper props.
 * @param props.steps - The ordered step labels.
 * @param props.activeStep - The zero-based index of the current step.
 * @param props.getStepInstructions - Returns the title and description for a step.
 * @param props.getStepContent - Returns the form content for a step.
 * @returns The rendered vertical stepper.
 */
export const IntegratedVerticalStepper: React.FC<IntegratedVerticalStepperProps> = ({
  steps,
  activeStep,
  getStepInstructions,
  getStepContent,
}) => {
  return (
    <Stack spacing={0}>
      {steps.map((label, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;
        const instructions = getStepInstructions(index);

        return (
          <Box key={label}>
            <StepRow
              index={index}
              label={label}
              isActive={isActive}
              isCompleted={isCompleted}
              instructions={instructions}
              content={isActive ? getStepContent(index) : null}
            />

            {/* Vertical Connector Line */}
            {index < steps.length - 1 && (
              <StepConnector isActive={isActive} isCompleted={isCompleted} />
            )}
          </Box>
        );
      })}
    </Stack>
  );
};
