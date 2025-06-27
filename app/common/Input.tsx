import { TextField } from '@mui/material'
import {
  Control,
  Controller,
  FieldValues,
  Path,
  PathValue,
} from 'react-hook-form'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  rules?: object
  type?: string
  // eslint-disable-next-line no-unused-vars
  onChange?: (value: number) => void
  disabled?: boolean
}

export const Input = <T extends FieldValues>({
  control,
  name,
  label,
  rules,
  type = 'text',
  onChange,
  disabled,
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={'' as PathValue<T, Path<T>>}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          onChange={e => {
            field.onChange(e)
            if (onChange) {
              onChange(Number(e.target.value))
            }
          }}
          fullWidth
          label={label}
          type={type}
          error={!!error}
          helperText={error?.message}
          disabled={disabled}
          sx={{ mb: 1 }}
        />
      )}
    />
  )
}
