import { Control } from 'react-hook-form'
import { FormData } from '../workflow/types'

export interface FormInputProps {
  formData: FormData
  updateFormData: (_data: Partial<FormData>) => void
}

export interface FormControlProps {
  control: Control<FormData>
  watch: (_name: string) => any
  setValue: (_name: string, _value: any) => void
}
