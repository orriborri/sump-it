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
/** Structural coffee-bean shape the selector renders, with a UI-only freshness hint. */
interface Bean {
  id: string;
  name: string;
  origin: string;
  roastDate: string;
  remainingGrams?: number | null;
  isFresh?: boolean;
}

/** Structural grinder shape the selector renders. */
interface Grinder {
  id: string;
  brand: string;
  model: string;
  grinderType: string;
  minSetting: number;
  maxSetting: number;
}

/** Props for the equipment-selection step. */
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

/**
 * Renders the primary name and secondary detail line shown inside a bean's
 * dropdown option, including origin, roast date and remaining grams when known.
 *
 * @param props - The option props.
 * @param props.bean - The bean to describe.
 * @returns The rendered bean option content.
 */
const BeanOption: React.FC<{ bean: Bean }> = ({ bean }) => (
  <Box>
    <Typography variant="body1">{bean.name}</Typography>
    <Typography variant="caption" color="text.secondary">
      {bean.origin} • {new Date(bean.roastDate).toLocaleDateString()}
      {bean.remainingGrams !== undefined && ` • ${bean.remainingGrams}g left`}
    </Typography>
  </Box>
);

/**
 * Renders the primary name and secondary detail line shown inside a grinder's
 * dropdown option, including the grinder type and setting range.
 *
 * @param props - The option props.
 * @param props.grinder - The grinder to describe.
 * @returns The rendered grinder option content.
 */
const GrinderOption: React.FC<{ grinder: Grinder }> = ({ grinder }) => (
  <Box>
    <Typography variant="body1">{grinder.brand} {grinder.model}</Typography>
    <Typography variant="caption" color="text.secondary">
      {grinder.grinderType} • Settings: {grinder.minSetting}-{grinder.maxSetting}
    </Typography>
  </Box>
);

/**
 * Renders the coffee-bean dropdown control, including the no-beans warning.
 *
 * @param props - The field props.
 * @param props.beans - The beans available to pick from.
 * @param props.value - The current bean id value.
 * @param props.onChange - Invoked when the bean selection changes.
 * @returns The rendered bean dropdown control.
 */
const BeanSelectField: React.FC<{
  beans: Bean[];
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ beans, value, onChange }) => (
  <FormControl fullWidth>
    <InputLabel id="bean-select-label">Coffee Bean</InputLabel>
    <Select
      labelId="bean-select-label"
      id="bean-select"
      value={value}
      label="Coffee Bean"
      onChange={onChange}
      disabled={beans.length === 0}
    >
      {beans.map(bean => (
        <MenuItem key={bean.id} value={bean.id}>
          <BeanOption bean={bean} />
        </MenuItem>
      ))}
    </Select>
    {beans.length === 0 && (
      <Alert severity="warning" sx={{ mt: 1 }}>
        No coffee beans found. Please add beans first.
      </Alert>
    )}
  </FormControl>
);

/**
 * Renders the coffee-bean selection column: the bean dropdown control plus the
 * freshness and remaining-quantity chips for the current selection.
 *
 * @param props - The column props.
 * @param props.beans - The beans available to pick from.
 * @param props.selectedBean - The currently selected bean, if any.
 * @param props.value - The current bean id value.
 * @param props.onChange - Invoked when the bean selection changes.
 * @returns The rendered bean-selection column.
 */
const BeanColumn: React.FC<{
  beans: Bean[];
  selectedBean?: Bean;
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ beans, selectedBean, value, onChange }) => (
  <Grid item xs={12} md={4}>
    <BeanSelectField beans={beans} value={value} onChange={onChange} />

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
);

/**
 * Renders the grinder dropdown control, including the no-grinders warning.
 *
 * @param props - The field props.
 * @param props.grinders - The grinders available to pick from.
 * @param props.value - The current grinder id value.
 * @param props.onChange - Invoked when the grinder selection changes.
 * @returns The rendered grinder dropdown control.
 */
const GrinderSelectField: React.FC<{
  grinders: Grinder[];
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ grinders, value, onChange }) => (
  <FormControl fullWidth>
    <InputLabel id="grinder-select-label">Grinder</InputLabel>
    <Select
      labelId="grinder-select-label"
      id="grinder-select"
      value={value}
      label="Grinder"
      onChange={onChange}
      disabled={grinders.length === 0}
    >
      {grinders.map(grinder => (
        <MenuItem key={grinder.id} value={grinder.id}>
          <GrinderOption grinder={grinder} />
        </MenuItem>
      ))}
    </Select>
    {grinders.length === 0 && (
      <Alert severity="warning" sx={{ mt: 1 }}>
        No grinders found. Please add a grinder first.
      </Alert>
    )}
  </FormControl>
);

/**
 * Renders the grinder selection column: the grinder dropdown control plus the
 * type and setting-range chips for the current selection.
 *
 * @param props - The column props.
 * @param props.grinders - The grinders available to pick from.
 * @param props.selectedGrinder - The currently selected grinder, if any.
 * @param props.value - The current grinder id value.
 * @param props.onChange - Invoked when the grinder selection changes.
 * @returns The rendered grinder-selection column.
 */
const GrinderColumn: React.FC<{
  grinders: Grinder[];
  selectedGrinder?: Grinder;
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ grinders, selectedGrinder, value, onChange }) => (
  <Grid item xs={12} md={4}>
    <GrinderSelectField grinders={grinders} value={value} onChange={onChange} />

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
);

/**
 * Renders the brewing-method selection column: the method dropdown and a chip
 * echoing the chosen method.
 *
 * @param props - The column props.
 * @param props.value - The current brewing-method value.
 * @param props.onChange - Invoked when the method selection changes.
 * @returns The rendered method-selection column.
 */
const MethodColumn: React.FC<{
  value: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ value, onChange }) => (
  <Grid item xs={12} md={4}>
    <FormControl fullWidth>
      <InputLabel id="method-select-label">Brewing Method</InputLabel>
      <Select
        labelId="method-select-label"
        id="method-select"
        value={value}
        label="Brewing Method"
        onChange={onChange}
      >
        {BREWING_METHODS.map(method => (
          <MenuItem key={method.value} value={method.value}>
            {method.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>

    {value && (
      <Box sx={{ mt: 2 }}>
        <Chip
          label={value}
          color="secondary"
          size="small"
        />
      </Box>
    )}
  </Grid>
);

/**
 * Renders a single labeled line in the selection summary, e.g. the chosen bean,
 * grinder or method, inside its own grid cell.
 *
 * @param props - The summary-item props.
 * @param props.label - The bold label prefix (Bean, Grinder or Method).
 * @param props.children - The value text for the line.
 * @returns The rendered summary line.
 */
const SummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Grid item xs={12} sm={4}>
    <Typography variant="body2">
      <strong>{label}:</strong> {children}
    </Typography>
  </Grid>
);

/**
 * Equipment-selection step: lets the user choose a coffee bean, a grinder and a
 * brewing method, showing freshness and remaining-quantity chips plus a summary
 * of the current selection.
 *
 * @param props - The step props.
 * @param props.formData - The current equipment selection (bean, grinder, method).
 * @param props.updateFormData - Applies a partial update to the brew form.
 * @param props.beans - The beans available to pick from.
 * @param props.grinders - The grinders available to pick from.
 * @param props.isLoading - Whether the bean and grinder lists are still loading.
 * @returns The rendered equipment-selection form.
 */
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
        <BeanColumn
          beans={beans}
          selectedBean={selectedBean}
          value={formData.beanId}
          onChange={handleBeanChange}
        />

        {/* Grinder Selection */}
        <GrinderColumn
          grinders={grinders}
          selectedGrinder={selectedGrinder}
          value={formData.grinderId}
          onChange={handleGrinderChange}
        />

        {/* Brewing Method Selection */}
        <MethodColumn value={formData.brewingMethod} onChange={handleMethodChange} />
      </Grid>

      {/* Selection Summary */}
      {(selectedBean || selectedGrinder || formData.brewingMethod) && (
        <Box sx={{ mt: 4, p: 2, bgcolor: '#F5F5F5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selection Summary:
          </Typography>
          <Grid container spacing={1}>
            {selectedBean && (
              <SummaryItem label="Bean">
                {selectedBean.name} ({selectedBean.origin})
              </SummaryItem>
            )}
            {selectedGrinder && (
              <SummaryItem label="Grinder">
                {selectedGrinder.brand} {selectedGrinder.model}
              </SummaryItem>
            )}
            {formData.brewingMethod && (
              <SummaryItem label="Method">{formData.brewingMethod}</SummaryItem>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
}