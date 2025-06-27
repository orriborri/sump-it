'use client'
import React from 'react'
import { Box, Button, Typography, Stack } from '@mui/material'
import { BeanSelector } from './BeanSelector'
import type { UseFormReturn } from './useForm'
import { FormStepper } from './Stepper'
import { EnhancedRecipe } from '../recipe/EnhancedRecipe'
import { GrindSettingInput } from '../brew-parameters/GrindSettingInput'
import { WaterDoseInputGroup } from '../brew-parameters/WaterDoseInputGroup'
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
  const steps = [
    'Select Bean & Brew',
    'Recipe',
    'Grind Setting',
    'Water Dosing',
  ]

  const renderStepContent = () => {
    switch (form.currentStep) {
      case 0:
        // Selection step - Bean & Brew
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select your coffee and brewing method
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
        // Selection step - Reference
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recipe
            </Typography>
            <EnhancedRecipe
              formData={form.formData}
              updateFormData={form.updateFormData}
            />
          </Box>
        )
      case 2:
        // Grind Setting step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Set grind setting
            </Typography>
            <GrindSettingInput
              formData={form.formData}
              updateFormData={form.updateFormData}
            />
          </Box>
        )
      case 3:
        // Water Dosing step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Set water & coffee dose
            </Typography>
            <WaterDoseInputGroup
              formData={form.formData}
              updateFormData={form.updateFormData}
            />
          </Box>
        )

      default:
        return null
    }
  }

  const {
    currentStep,
    prevStep,
    nextStep,
    formData: _formData,
    updateFormData: _updateFormData,
  } = form
  const isLastStep = currentStep === steps.length - 1

  return (
    <Box sx={{ width: '100%' }}>
      <FormStepper steps={steps} activeStep={currentStep} />

      <Box sx={{ mt: 4, mb: 4 }}>{renderStepContent()}</Box>

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
          onClick={isLastStep ? onSubmit : nextStep}
          type="button"
        >
          {isLastStep ? 'Start Brewing' : 'Next'}
        </Button>
      </Stack>
    </Box>
  )
}
