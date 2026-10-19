// Bean Selector Component
// From sump-it: Equipment selection step
'use client';

import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { type BrewFormData } from '@/lib/brew/recipe';

// Accepts the generated CoffeeBean/Grinder shapes (nullable fields) plus the
// UI-only `isFresh` hint. Kept structural so the generated types from
// `@/lib/api/types` assign without conversion.
interface Bean {
  id: string;
  name: string;
  origin: string;
  roastDate: string;
  remainingGrams?: number | null;
  isFresh?: boolean;
}

interface Grinder {
  id: string;
  brand: string;
  model: string;
  grinderType: string;
  minSetting: number;
  maxSetting: number;
}

interface BeanSelectorProps {
  formData: {
    beanId: string;
    grinderId: string;
    brewingMethod: string;
  };
  updateFormData: (updates: Partial<BrewFormData>) => void;
  beans: Bean[];
  grinders: Grinder[];
  isLoading: boolean;
}

const BREWING_METHODS = [
  { value: 'V60', label: 'V60' },
  { value: 'Chemex', label: 'Chemex' },
  { value: 'FrenchPress', label: 'French Press' },
  { value: 'AeroPress', label: 'AeroPress' },
  { value: 'Espresso', label: 'Espresso' },
  { value: 'Moka', label: 'Moka Pot' },
  { value: 'ColdBrew', label: 'Cold Brew' },
  { value: 'Other', label: 'Other' },
];

export function BeanSelector({
  formData,
  updateFormData,
  beans,
  grinders,
  isLoading,
}: BeanSelectorProps) {
  const handleBeanChange = (event: SelectChangeEvent) => {
    updateFormData({ beanId: event.target.value });
  };

  const handleGrinderChange = (event: SelectChangeEvent) => {
    updateFormData({ grinderId: event.target.value });
  };

  const handleMethodChange = (event: SelectChangeEvent) => {
    updateFormData({ brewingMethod: event.target.value });
  };

  const selectedBean = beans.find(b => b.id === formData.beanId);
  const selectedGrinder = grinders.find(g => g.id === formData.grinderId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2C1810', mb: 3 }}>
        Select Your Equipment
      </Typography>

      <Grid container spacing={3}>
        {/* Coffee Bean Selection */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="bean-select-label">Coffee Bean</InputLabel>
            <Select
              labelId="bean-select-label"
              id="bean-select"
              value={formData.beanId}
              label="Coffee Bean"
              onChange={handleBeanChange}
              disabled={beans.length === 0}
            >
              {beans.map(bean => (
                <MenuItem key={bean.id} value={bean.id}>
                  <Box>
                    <Typography variant="body1">{bean.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bean.origin} • {new Date(bean.roastDate).toLocaleDateString()}
                      {bean.remainingGrams !== undefined && ` • ${bean.remainingGrams}g left`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {beans.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                No coffee beans found. Please add beans first.
              </Alert>
            )}
          </FormControl>
          
          {selectedBean && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={selectedBean.isFresh ? 'Fresh beans' : 'Aged beans'}
                color={selectedBean.isFresh ? 'success' : 'default'}
                size="small"
                sx={{ mr: 1 }}
              />
              {selectedBean.remainingGrams != null && (
                <Chip
                  label={`${selectedBean.remainingGrams}g remaining`}
                  color={selectedBean.remainingGrams > 0 ? 'info' : 'error'}
                  size="small"
                />
              )}
            </Box>
          )}
        </Grid>

        {/* Grinder Selection */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="grinder-select-label">Grinder</InputLabel>
            <Select
              labelId="grinder-select-label"
              id="grinder-select"
              value={formData.grinderId}
              label="Grinder"
              onChange={handleGrinderChange}
              disabled={grinders.length === 0}
            >
              {grinders.map(grinder => (
                <MenuItem key={grinder.id} value={grinder.id}>
                  <Box>
                    <Typography variant="body1">{grinder.brand} {grinder.model}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {grinder.grinderType} • Settings: {grinder.minSetting}-{grinder.maxSetting}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {grinders.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                No grinders found. Please add a grinder first.
              </Alert>
            )}
          </FormControl>
          
          {selectedGrinder && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={selectedGrinder.grinderType}
                color="primary"
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`Settings: ${selectedGrinder.minSetting}-${selectedGrinder.maxSetting}`}
                color="info"
                size="small"
              />
            </Box>
          )}
        </Grid>

        {/* Brewing Method Selection */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="method-select-label">Brewing Method</InputLabel>
            <Select
              labelId="method-select-label"
              id="method-select"
              value={formData.brewingMethod}
              label="Brewing Method"
              onChange={handleMethodChange}
            >
              {BREWING_METHODS.map(method => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {formData.brewingMethod && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={formData.brewingMethod}
                color="secondary"
                size="small"
              />
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Selection Summary */}
      {(selectedBean || selectedGrinder || formData.brewingMethod) && (
        <Box sx={{ mt: 4, p: 2, bgcolor: '#F5F5F5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selection Summary:
          </Typography>
          <Grid container spacing={1}>
            {selectedBean && (
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Bean:</strong> {selectedBean.name} ({selectedBean.origin})
                </Typography>
              </Grid>
            )}
            {selectedGrinder && (
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Grinder:</strong> {selectedGrinder.brand} {selectedGrinder.model}
                </Typography>
              </Grid>
            )}
            {formData.brewingMethod && (
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Method:</strong> {formData.brewingMethod}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
}