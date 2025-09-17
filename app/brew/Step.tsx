'use client'
import React from 'react'
import { Box, Button, Typography, Stack, Paper, Alert } from '@mui/material'
import { BeanSelector } from './BeanSelector'
import type { UseFormReturn } from './useForm'
import { IntegratedVerticalStepper } from './IntegratedVerticalStepper'
import { BrewingParameters } from './BrewingParameters'
import { BrewRating } from './feedback/BrewRating'
import { useStepNavigation } from './useStepNavigation'
import type { RuntimeType } from '@/app/lib/types'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'

interface StepProps {
  form: UseFormReturn
  onSubmit?: () => void
  beans?: RuntimeType<Beans>[]
  methods?: RuntimeType<Methods>[]
  grinders?: RuntimeType<Grinders>[]
}

export const Step: React.FC<StepProps> = ({
  form,
  onSubmit,
  beans,
  methods,
  grinders,
}) => {
  const stepConfig = [
    {
      label: 'Equipment Selection',
      title: "Select your coffee and brewing equipment",
      description: "Choose the coffee beans, brewing method, and grinder for your brew.",
      content: (
        <BeanSelector
          form={form}
          beans={beans}
          methods={methods}
          grinders={grinders}
        />
      )
    },
    {
      label: 'Brewing Parameters',
      title: "Configure your brewing parameters and start brewing",
      description: "Set coffee amount, grind setting, and ratio based on previous brew feedback.",
      content: (
        <BrewingParameters
          formData={form.formData}
          updateFormData={form.updateFormData}
          onSubmit={onSubmit}
          grinders={grinders}
        />
      )
    }
  ]

  const steps = stepConfig.map(step => step.label)
  const getStepInstructions = (stepIndex: number) => stepConfig[stepIndex] || stepConfig[0]
  const getStepContent = (stepIndex: number) => stepConfig[stepIndex]?.content || null

  const navigation = useStepNavigation({
    currentStep: form.currentStep,
    formData: form.formData,
    totalSteps: steps.length,
  })

  const {
    currentStep,
    prevStep,
    nextStep,
    formData: _formData,
    updateFormData: _updateFormData,
  } = form


  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Paper
        elevation={1}
        sx={{
          p: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          minHeight: '70vh',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
          Brewing Steps
        </Typography>

        {/* Integrated Vertical Stepper with Form Content */}
        <IntegratedVerticalStepper
          steps={steps}
          activeStep={currentStep}
          getStepInstructions={getStepInstructions}
          getStepContent={getStepContent}
        />

        {/* Navigation Buttons */}
        <Box sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          {!navigation.canGoBack && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Please complete all selections before proceeding to brewing parameters.
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
              onClick={prevStep}
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

            {!navigation.isLastStep && (
              <Button
                variant="contained"
                color="primary"
                onClick={nextStep}
                type="button"
                size="large"
                disabled={!navigation.canGoForward}
                sx={{
                  minWidth: { xs: '100%', sm: 120 },
                  order: { xs: 1, sm: 2 }
                }}
              >
                Next
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
