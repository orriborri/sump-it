import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { FormData } from '../types'

/** Props for form input components that read and update brew form data. */
export interface FormInputProps {
  formData: FormData
  updateFormData: (_data: Partial<FormData>) => void
}

/** Props for React Hook Form controlled input components. */
export interface FormControlProps {
  control: Control<FormData>
  watch: UseFormWatch<FormData>
  setValue: UseFormSetValue<FormData>
}
