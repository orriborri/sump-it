import { TextField } from "@mui/material";
import { Control, Controller, FieldValues, Path, RegisterOptions } from "react-hook-form";

interface InputProps<F extends FieldValues> {
  control: Control<F>;
  name: keyof F;
  label: string;
  type?: string;
  rules?: Omit<RegisterOptions<F, Path<F>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs'>;
}

export const Input = <F extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  rules
}: InputProps<F>) => {
  return (
    <Controller
      name={name as Path<F>}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          type={type}
          fullWidth
          sx={{ mb: 1 }}
          error={!!error}
          helperText={error?.message}
        />
      )}
    />
  );
};
