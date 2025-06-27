'use client'
import React from 'react'
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material'
import { BeanSelector } from '../workflow/BeanSelector'
import type { UseFormReturn } from '../workflow/useForm'
import { FormStepper } from '../workflow/Stepper'
import { CompactVerticalStepper } from './CompactVerticalStepper'
import { ComprehensiveRecipe } from './ComprehensiveRecipe'
import type { RuntimeType } from '@/app/lib/types'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'

interface BrewStepsProps {
  form: UseFormReturn
  onSubmit?: () => void
  isLoading?: boolean
  stepperStyle?: 'vertical' | 'compact'
  beans?: RuntimeType<Beans>[]
  methods?: RuntimeType<Methods>[]
  grinders?: RuntimeType<Grinders>[]
}

export const BrewSteps: React.FC<BrewStepsProps> = ({
  form,
  onSubmit,
  isLoading = false,
  stepperStyle = 'vertical', // Changed default to vertical (form between steps)
  beans,
  methods,
  grinders,
}) => {
  const steps = ['Select Bean & Brew', 'Recipe']

  const renderStepContent = () => {
    switch (form.currentStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Choose your coffee beans, brewing method, and grinder to get
              started.
            </Typography>
            <BeanSelector
              form={form}
              beans={beans}
              methods={methods}
              grinders={grinders}
            />
          </Box>
        )
      case 1:
        return (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Set your complete brewing recipe including recommendations, grind
              setting, water and coffee dose.
            </Typography>
            <ComprehensiveRecipe
              formData={form.formData}
              updateFormData={form.updateFormData}
            />
          </Box>
        )

      default:
        return null
    }
  }

  const { currentStep, prevStep, nextStep } = form
  const isLastStep = currentStep === steps.length - 1
  const canProceed = getCanProceed()

  function getCanProceed(): boolean {
    switch (currentStep) {
      case 0:
        // Check if all required selections are made (including auto-selections)
        return !!(
          form.formData.bean_id > 0 &&
          form.formData.method_id > 0 &&
          form.formData.grinder_id > 0
        )
      case 1:
        return !!(
          form.formData.water &&
          form.formData.dose &&
          form.formData.grind &&
          form.formData.ratio
        )
      default:
        return false
    }
  }

  const renderActionButtons = () => (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      sx={{
        mt: 3,
        pt: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Button
        variant="outlined"
        disabled={currentStep === 0 || isLoading}
        onClick={prevStep}
        size="large"
        fullWidth
      >
        Back
      </Button>

      <Button
        variant="contained"
        color="primary"
        onClick={isLastStep ? onSubmit : nextStep}
        disabled={!canProceed || isLoading}
        type="button"
        size="large"
        fullWidth
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
      >
        {isLoading ? 'Processing...' : isLastStep ? 'Start Brewing' : 'Next'}
      </Button>
    </Stack>
  )

  if (stepperStyle === 'compact') {
    return (
      <CompactVerticalStepper steps={steps} activeStep={currentStep}>
        {renderStepContent()}
        {renderActionButtons()}
      </CompactVerticalStepper>
    )
  }

  // Default vertical stepper (form content between steps)
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      <FormStepper steps={steps} activeStep={currentStep}>
        <Box
          sx={{
            minHeight: 300,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {renderStepContent()}
        </Box>
        {renderActionButtons()}
      </FormStepper>
    </Box>
  )
}
