import { Control } from 'react-hook-form';
import { FormData } from '../workflow/types';

export interface FormInputProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export interface FormControlProps {
  control: Control<FormData>;
  watch: (name: string) => any;
  setValue: (name: string, value: any) => void;
}