import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { FormData } from '../types'

export interface FormInputProps {
  formData: FormData
  updateFormData: (_data: Partial<FormData>) => void
}

export interface FormControlProps {
  control: Control<FormData>
  watch: UseFormWatch<FormData>
  setValue: UseFormSetValue<FormData>
}
