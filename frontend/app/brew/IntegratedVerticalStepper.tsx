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

/** Props for {@link IntegratedVerticalStepper}. */
interface IntegratedVerticalStepperProps {
  /** Ordered step labels, one entry per workflow step. */
  steps: string[];
  /** Zero-based index of the step the user is currently on. */
  activeStep: number;
  /** Returns the title/description shown for a given step index. */
  getStepInstructions: (stepIndex: number) => { title: string; description: string };
  /** Returns the form content for a given step index (only evaluated for the active step). */
  getStepContent: (stepIndex: number) => React.ReactNode;
}

/** Props for {@link StepStatusChip}. */
interface StepStatusChipProps {
  /** Whether this step is the active one. */
  isActive: boolean;
  /** Whether this step has already been completed. */
  isCompleted: boolean;
}

/**
 * Renders the small status chip ("Current Step" / "Completed") under a step
 * header. Renders nothing for steps that are neither active nor completed.
 */
const StepStatusChip: React.FC<StepStatusChipProps> = ({ isActive, isCompleted }) => {
  if (isActive) {
    return (
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
    );
  }
  if (isCompleted) {
    return (
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
    );
  }
  return null;
};

/** Props for {@link StepIndicator}. */
interface StepIndicatorProps {
  /** Zero-based index of the step this indicator represents. */
  index: number;
  /** Whether this step is the active one. */
  isActive: boolean;
  /** Whether this step has already been completed. */
  isCompleted: boolean;
}

/**
 * The circular step indicator shown to the left of each step: a check icon for
 * completed steps, otherwise the one-based step number.
 */
const StepIndicator: React.FC<StepIndicatorProps> = ({ index, isActive, isCompleted }) => (
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

/** Props for {@link StepBody}. */
interface StepBodyProps {
  /** Zero-based index of the step this body represents. */
  index: number;
  /** The step label. */
  label: string;
  /** Whether this step is the active one. */
  isActive: boolean;
  /** Whether this step has already been completed. */
  isCompleted: boolean;
  /** The title/description instructions for this step. */
  instructions: { title: string; description: string };
  /** Returns the form content for a given step index (only evaluated for the active step). */
  getStepContent: (stepIndex: number) => React.ReactNode;
}

/**
 * The content column of a single step: header, status chip, active-step
 * instructions, the collapsible form content, and the completed-step summary.
 * The step form content is only evaluated while the step is active, preserving
 * the lazy-evaluation contract of {@link IntegratedVerticalStepper}.
 */
const StepBody: React.FC<StepBodyProps> = ({
  index,
  label,
  isActive,
  isCompleted,
  instructions,
  getStepContent,
}) => (
  <Box sx={{ flex: 1, pb: 4 }}>
    {/* Step Header */}
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
      <StepStatusChip isActive={isActive} isCompleted={isCompleted} />
    </Box>

    {/* Step Instructions - Always visible for active step */}
    {isActive && (
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
          {instructions.title}
        </Typography>

        <Typography
          variant="body2"
          color="#3C2415"
          sx={{ lineHeight: 1.6, fontSize: '0.95rem' }}
        >
          {instructions.description}
        </Typography>
      </Paper>
    )}

    {/* Step Form Content - Only for active step */}
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
        {isActive && getStepContent(index)}
      </Paper>
    </Collapse>

    {/* Completed step summary */}
    {isCompleted && (
      <Typography
        variant="body2"
        color="success.main"
        sx={{
          fontStyle: 'italic',
          mt: 1,
        }}
      >
        ✓ {instructions.title}
      </Typography>
    )}
  </Box>
);

/** Props for {@link StepItem}. */
interface StepItemProps {
  /** Zero-based index of the step. */
  index: number;
  /** The step label. */
  label: string;
  /** Total number of steps (used to decide whether to draw the connector). */
  stepCount: number;
  /** Index of the currently active step. */
  activeStep: number;
  /** Returns the title/description shown for a given step index. */
  getStepInstructions: (stepIndex: number) => { title: string; description: string };
  /** Returns the form content for a given step index (only evaluated for the active step). */
  getStepContent: (stepIndex: number) => React.ReactNode;
}

/**
 * A single step row: the indicator, the step body, and the vertical connector
 * line to the next step (omitted after the last step).
 */
const StepItem: React.FC<StepItemProps> = ({
  index,
  label,
  stepCount,
  activeStep,
  getStepInstructions,
  getStepContent,
}) => {
  const isActive = index === activeStep;
  const isCompleted = index < activeStep;
  const instructions = getStepInstructions(index);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {/* Step Number/Icon */}
        <StepIndicator index={index} isActive={isActive} isCompleted={isCompleted} />

        {/* Step Content */}
        <StepBody
          index={index}
          label={label}
          isActive={isActive}
          isCompleted={isCompleted}
          instructions={instructions}
          getStepContent={getStepContent}
        />
      </Stack>

      {/* Vertical Connector Line */}
      {index < stepCount - 1 && (
        <Box
          sx={{
            width: 3,
            height: 32,
            bgcolor: isCompleted ? 'success.main' : isActive ? 'primary.main' : 'grey.300',
            ml: 2.25,
            transition: 'all 0.3s ease',
          }}
        />
      )}
    </Box>
  );
};

/**
 * The unique 3-step vertical brewing stepper from sump-it. Renders every step
 * label with an indicator, inline instructions and (for the active step) its
 * form content. Only the active step's `getStepContent` is evaluated, keeping
 * the forms lazily mounted.
 */
export const IntegratedVerticalStepper: React.FC<IntegratedVerticalStepperProps> = ({
  steps,
  activeStep,
  getStepInstructions,
  getStepContent,
}) => {
  return (
    <Stack spacing={0}>
      {steps.map((label, index) => (
        <StepItem
          key={label}
          index={index}
          label={label}
          stepCount={steps.length}
          activeStep={activeStep}
          getStepInstructions={getStepInstructions}
          getStepContent={getStepContent}
        />
      ))}
    </Stack>
  );
};
