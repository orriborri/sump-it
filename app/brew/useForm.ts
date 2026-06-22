'use client'
import { useState, useCallback } from 'react'
import { FormData } from './types'

// Constants moved to the top for better readability
const INITIAL_WATER = 250
const INITIAL_DOSE = 15
const INITIAL_RATIO = 16.67
const INITIAL_GRIND = 20

/**
 * Return type interface for the useForm hook
 * Defines the shape of form state and control methods available to consumers
 */
export interface UseFormReturn {
  formData: FormData
  currentStep: number
  nextStep: () => void
  prevStep: () => void
  updateFormData: (_data: Partial<FormData>) => void
  prefillForm: (_data: FormData, _options?: { skipToStep?: number }) => void
}

/**
 * Custom hook that manages the multi-step brew form state and navigation
 * Provides form data, step control, and methods to update or prefill the form
 * @returns Object containing form data, current step, and form manipulation methods
 */
export const useForm = (): UseFormReturn => {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    bean_id: 0,
    method_id: 0,
    grinder_id: 0,
    water: INITIAL_WATER,
    dose: INITIAL_DOSE,
    ratio: INITIAL_RATIO,
    grind: INITIAL_GRIND,
  })

  /**
   * Advances the form to the next step in the workflow
   */
  const nextStep = () => {
    setCurrentStep(prev => prev + 1)
  }

  /**
   * Returns the form to the previous step in the workflow
   */
  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  /**
   * Merges partial form data updates into the current form state
   * @param _data - Partial form data to merge with existing values
   */
  const updateFormData = useCallback((_data: Partial<FormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ..._data,
    }))
  }, [])

  /**
   * Pre-fill all form fields at once and optionally jump to a specific step.
   * Used by Quick Brew to skip the equipment selection step entirely.
   */
  const prefillForm = useCallback((_data: FormData, _options?: { skipToStep?: number }) => {
    setFormData(_data)
    if (_options?.skipToStep !== undefined) {
      setCurrentStep(_options.skipToStep)
    }
  }, [])

  return {
    formData,
    currentStep,
    nextStep,
    prevStep,
    updateFormData,
    prefillForm,
  }
}
