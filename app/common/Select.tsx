import {
  FormControl,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
} from '@mui/material'
import {
  Control,
  Controller,
  FieldValues,
  Path,
  PathValue,
} from 'react-hook-form'

interface GenericSelectProps<T, F extends FieldValues> {
  control: Control<F>
  name: Path<F>
  label: string
  items: T[]
  getKey: (_item: T) => number | string
  getValue: (_item: T) => string
  getLabel: (_item: T) => string
}

export const Select = <T, F extends FieldValues>({
  control,
  name,
  label,
  items,
  getKey,
  getValue,
  getLabel,
}: GenericSelectProps<T, F>) => {
  return (
    <Controller
      name={name as Path<F>}
      control={control}
      defaultValue={'' as PathValue<F, Path<F>>}
      render={({ field }) => (
        <FormControl fullWidth sx={{ mb: 1 }}>
          <InputLabel>{label}</InputLabel>
          <MuiSelect {...field} label={label}>
            {items.map(item => (
              <MenuItem key={getKey(item)} value={getValue(item)}>
                {getLabel(item)}
              </MenuItem>
            ))}
          </MuiSelect>
        </FormControl>
      )}
    />
  )
}
