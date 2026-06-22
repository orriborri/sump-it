import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { FormData } from '../types'

/**
 * Props interface for form input components using direct state management
 * Components receive the full form data and an update function
 */
export interface FormInputProps {
  formData: FormData
  updateFormData: (_data: Partial<FormData>) => void
}

/**
 * Props interface for form components using React Hook Form
 * Provides control, watch, and setValue for field-level form management
 */
export interface FormControlProps {
  control: Control<FormData>
  watch: UseFormWatch<FormData>
  setValue: UseFormSetValue<FormData>
}
