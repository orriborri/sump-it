'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'
import { RuntimeType } from '@/app/lib/types'
import type { UseFormReturn } from './useForm'
import { MOCK_BEANS, MOCK_METHODS, MOCK_GRINDERS } from './constants'

interface BeanSelectorProps {
  form: UseFormReturn
  beans?: RuntimeType<Beans>[]
  methods?: RuntimeType<Methods>[]
  grinders?: RuntimeType<Grinders>[]
}

export const BeanSelector: React.FC<BeanSelectorProps> = ({
  form,
  beans,
  methods,
  grinders,
}) => {
  const [availableBeans, setAvailableBeans] = useState(beans || MOCK_BEANS)
  const [availableMethods, setAvailableMethods] = useState(
    methods || MOCK_METHODS
  )
  const [availableGrinders, setAvailableGrinders] = useState(
    grinders || MOCK_GRINDERS
  )

  // Update state when props change

  useEffect(() => {
    if (beans) setAvailableBeans(beans)
    if (methods) setAvailableMethods(methods)
    if (grinders) setAvailableGrinders(grinders)
  }, [beans, methods, grinders])

  // Auto-select grinder if only one is available
  useEffect(() => {
    if (
      availableGrinders.length === 1 &&
      form.formData.grinder_id !== availableGrinders[0].id
    ) {
      form.updateFormData({ grinder_id: availableGrinders[0].id })
    }
  }, [availableGrinders, form])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Select the coffee beans, brewing method, and grinder for your brew.
      </Typography>

      <FormControl fullWidth>
        <InputLabel id="bean-select-label">Coffee Beans</InputLabel>
        <Select
          labelId="bean-select-label"
          id="bean-select"
          name="bean_id"
          value={form.formData.bean_id > 0 ? form.formData.bean_id.toString() : ''}
          label="Coffee Beans"
          onChange={e =>
            form.updateFormData({ bean_id: parseInt(e.target.value) })
          }
        >
          {availableBeans.map(bean => (
            <MenuItem key={bean.id} value={bean.id.toString()}>
              {bean.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id="method-select-label">Brewing Method</InputLabel>
        <Select
          labelId="method-select-label"
          id="method-select"
          name="method_id"
          value={form.formData.method_id > 0 ? form.formData.method_id.toString() : ''}
          label="Brewing Method"
          onChange={e =>
            form.updateFormData({ method_id: parseInt(e.target.value) })
          }
        >
          {availableMethods.map(method => (
            <MenuItem key={method.id} value={method.id.toString()}>
              {method.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id="grinder-select-label">Grinder</InputLabel>
        <Select
          labelId="grinder-select-label"
          id="grinder-select"
          name="grinder_id"
          value={form.formData.grinder_id > 0 ? form.formData.grinder_id.toString() : ''}
          label="Grinder"
          onChange={e =>
            form.updateFormData({ grinder_id: parseInt(e.target.value) })
          }
        >
          {availableGrinders.map(grinder => (
            <MenuItem key={grinder.id} value={grinder.id.toString()}>
              {grinder.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
