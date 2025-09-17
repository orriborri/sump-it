'use client'
import { FormData } from './types'

interface UseStepNavigationProps {
  currentStep: number
  formData: FormData
  totalSteps: number
}

export const useStepNavigation = ({ currentStep, formData, totalSteps }: UseStepNavigationProps) => {
  const getValidationErrors = () => {
    const errors = []
    
    // Step 1 validation
    if (currentStep >= 0) {
      if (formData.bean_id === 0) errors.push('Select a coffee bean')
      if (formData.method_id === 0) errors.push('Select a brewing method')
      if (formData.grinder_id === 0) errors.push('Select a grinder')
    }
    
    // Step 2 validation
    if (currentStep >= 1) {
      if (!formData.dose || formData.dose <= 0) errors.push('Enter coffee amount')
      if (!formData.grind || formData.grind <= 0) errors.push('Set grind setting')
      if (!formData.water || formData.water <= 0) errors.push('Enter water amount')
    }
    
    return errors
  }

  const validationErrors = getValidationErrors()
  const isFormValid = validationErrors.length === 0

  const isLastStep = currentStep === totalSteps - 1
  const canGoBack = currentStep > 0
  const canSubmit = isLastStep && isFormValid
  
  // Can go forward if current step is valid
  const canGoForward = currentStep === 0 ? 
    formData.bean_id > 0 && formData.method_id > 0 && formData.grinder_id > 0 :
    true

  return {
    isFormValid,
    isLastStep,
    canGoBack,
    canGoForward,
    canSubmit,
    validationErrors,
  }
}