import { SelectChangeEvent } from '@mui/material';

export interface FormData {
  bean_id: string;
  method_id: string;
  grinder_id: string;
  water: number;
  dose: number;
  ratio: number;
  grind: number;
}

export interface StepProps {
  currentStep: number;
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent) => void;
  nextStep: () => void;
  prevStep: () => void;
  isLastStep: boolean;
  setFormData: (data: FormData) => void;
}