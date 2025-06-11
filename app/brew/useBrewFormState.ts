"use client";
import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema for form validation
export const brewFormSchema = z.object({
  bean_id: z.string().min(1, 'Bean selection is required'),
  method_id: z.string().min(1, 'Method selection is required'),
  grinder_id: z.string().min(1, 'Grinder selection is required'),
  water: z.number().min(1, 'Water must be at least 1ml'),
  dose: z.number().min(1, 'Dose must be at least 1g'),
  ratio: z.number().min(1, 'Ratio must be at least 1:1'),
  grind: z.number().optional(),
});

export type BrewFormData = z.infer<typeof brewFormSchema>;

interface UseBrewFormStateProps {
  defaultValues?: Partial<BrewFormData>;
}

export const useBrewFormState = ({ defaultValues = {} }: UseBrewFormStateProps = {}) => {
  const { control, handleSubmit, watch, setValue } = useReactHookForm<BrewFormData>({
    defaultValues: {
      bean_id: '',
      method_id: '',
      grinder_id: '',
      water: 250,
      dose: 15,
      ratio: 16.67,
      grind: 20,
      ...defaultValues,
    },
    resolver: zodResolver(brewFormSchema) as any, // Explicitly cast to any to avoid deep type instantiation
  });

  // Helper values from the form
  const waterValue = watch('water');
  const doseValue = watch('dose');
  const ratioValue = watch('ratio');

  const onSubmit = handleSubmit((data) => {
    // Handle form submission
    console.log(data);
    // You would typically make an API call here
  });

  return {
    control,
    watch,
    setValue,
    onSubmit,
    waterValue,
    doseValue,
    ratioValue,
  };
};
