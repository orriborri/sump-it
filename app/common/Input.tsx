import { TextField } from "@mui/material";
import {
  Control,
  Controller,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";

interface InputProps<F extends FieldValues> {
  control: Control<F>;
  name: keyof F;
  label: string;
  type?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
  rules?: Omit<
    RegisterOptions<F, Path<F>>,
    "valueAsNumber" | "valueAsDate" | "setValueAs"
  >;
}

export const Input = <F extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  disabled = false,
  onChange,
  rules,
}: InputProps<F>) => {
  return (
    <Controller
      name={name as Path<F>}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          onChange={(e) => {
            field.onChange(e);
            if (onChange && type === "number") {
              onChange(parseFloat(e.target.value));
            }
          }}
          label={label}
          type={type}
          disabled={disabled}
          fullWidth
          sx={{ mb: 1 }}
          error={!!error}
          helperText={error?.message}
        />
      )}
    />
  );
};
