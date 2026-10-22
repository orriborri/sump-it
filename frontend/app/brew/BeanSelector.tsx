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
import { BREWING_METHODS, type BrewFormData } from '@/lib/brew/recipe';
import type { BrewingMethod } from '@/lib/api/types';

/**
 * A coffee bean option.
 *
 * Accepts the generated CoffeeBean/Grinder shapes (nullable fields) plus the
 * UI-only `isFresh` hint. Kept structural so the generated types from
 * `@/lib/api/types` assign without conversion.
 */
interface Bean {
  id: string;
  name: string;
  origin: string;
  roastDate: string;
  remainingGrams?: number | null;
  isFresh?: boolean;
}

/** A grinder option shown in the equipment selector. */
interface Grinder {
  id: string;
  brand: string;
  model: string;
  grinderType: string;
  minSetting: number;
  maxSetting: number;
}

/** Props for {@link BeanSelector}. */
interface BeanSelectorProps {
  /** The equipment selections currently held in the brew form. */
  formData: {
    beanId: string;
    grinderId: string;
    brewingMethod: BrewingMethod | '';
  };
  /** Applies a partial update to the parent brew form. */
  updateFormData: (updates: Partial<BrewFormData>) => void;
  /** Available coffee beans to choose from. */
  beans: Bean[];
  /** Available grinders to choose from. */
  grinders: Grinder[];
  /** Whether the equipment data is still loading. */
  isLoading: boolean;
}

/** The two-line label rendered inside a bean dropdown option. */
const BeanOptionLabel: React.FC<{ bean: Bean }> = ({ bean }) => (
  <Box>
    <Typography variant="body1">{bean.name}</Typography>
    <Typography variant="caption" color="text.secondary">
      {bean.origin} • {new Date(bean.roastDate).toLocaleDateString()}
      {bean.remainingGrams !== undefined && ` • ${bean.remainingGrams}g left`}
    </Typography>
  </Box>
);

/** The two-line label rendered inside a grinder dropdown option. */
const GrinderOptionLabel: React.FC<{ grinder: Grinder }> = ({ grinder }) => (
  <Box>
    <Typography variant="body1">{grinder.brand} {grinder.model}</Typography>
    <Typography variant="caption" color="text.secondary">
      {grinder.grinderType} • Settings: {grinder.minSetting}-{grinder.maxSetting}
    </Typography>
  </Box>
);

/** The bean `<Select>` dropdown with one option per bean. */
const BeanDropdown: React.FC<{
  beans: Bean[];
  beanId: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ beans, beanId, onChange }) => (
  <Select
    labelId="bean-select-label"
    id="bean-select"
    value={beanId}
    label="Coffee Bean"
    onChange={onChange}
    disabled={beans.length === 0}
  >
    {beans.map(bean => (
      <MenuItem key={bean.id} value={bean.id}>
        <BeanOptionLabel bean={bean} />
      </MenuItem>
    ))}
  </Select>
);

/** The grinder `<Select>` dropdown with one option per grinder. */
const GrinderDropdown: React.FC<{
  grinders: Grinder[];
  grinderId: string;
  onChange: (event: SelectChangeEvent) => void;
}> = ({ grinders, grinderId, onChange }) => (
  <Select
    labelId="grinder-select-label"
    id="grinder-select"
    value={grinderId}
    label="Grinder"
    onChange={onChange}
    disabled={grinders.length === 0}
  >
    {grinders.map(grinder => (
      <MenuItem key={grinder.id} value={grinder.id}>
        <GrinderOptionLabel grinder={grinder} />
      </MenuItem>
    ))}
  </Select>
);

/** The brewing-method `<Select>` dropdown with one option per method. */
const MethodDropdown: React.FC<{
  brewingMethod: BrewingMethod | '';
  onChange: (event: SelectChangeEvent) => void;
}> = ({ brewingMethod, onChange }) => (
  <Select
    labelId="method-select-label"
    id="method-select"
    value={brewingMethod}
    label="Brewing Method"
    onChange={onChange}
  >
    {BREWING_METHODS.map(method => (
      <MenuItem key={method.value} value={method.value}>
        {method.label}
      </MenuItem>
    ))}
  </Select>
);

/** Props for {@link BeanSelectColumn}. */
interface BeanSelectColumnProps {
  /** Beans available for selection. */
  beans: Bean[];
  /** The currently selected bean id. */
  beanId: string;
  /** The currently selected bean, if any. */
  selectedBean?: Bean;
  /** Handles a change of the selected bean. */
  onChange: (event: SelectChangeEvent) => void;
}

/** The coffee-bean selection column: the dropdown plus freshness chips. */
const BeanSelectColumn: React.FC<BeanSelectColumnProps> = ({
  beans,
  beanId,
  selectedBean,
  onChange,
}) => (
  <Grid item xs={12} md={4}>
    <FormControl fullWidth>
      <InputLabel id="bean-select-label">Coffee Bean</InputLabel>
      <BeanDropdown beans={beans} beanId={beanId} onChange={onChange} />
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
);

/** Props for {@link GrinderSelectColumn}. */
interface GrinderSelectColumnProps {
  /** Grinders available for selection. */
  grinders: Grinder[];
  /** The currently selected grinder id. */
  grinderId: string;
  /** The currently selected grinder, if any. */
  selectedGrinder?: Grinder;
  /** Handles a change of the selected grinder. */
  onChange: (event: SelectChangeEvent) => void;
}

/** The grinder selection column: the dropdown plus grinder-detail chips. */
const GrinderSelectColumn: React.FC<GrinderSelectColumnProps> = ({
  grinders,
  grinderId,
  selectedGrinder,
  onChange,
}) => (
  <Grid item xs={12} md={4}>
    <FormControl fullWidth>
      <InputLabel id="grinder-select-label">Grinder</InputLabel>
      <GrinderDropdown grinders={grinders} grinderId={grinderId} onChange={onChange} />
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
);

/** Props for {@link MethodSelectColumn}. */
interface MethodSelectColumnProps {
  /** The currently selected brewing method. */
  brewingMethod: BrewingMethod | '';
  /** Handles a change of the selected brewing method. */
  onChange: (event: SelectChangeEvent) => void;
}

/** The brewing-method selection column: the dropdown plus a method chip. */
const MethodSelectColumn: React.FC<MethodSelectColumnProps> = ({ brewingMethod, onChange }) => (
  <Grid item xs={12} md={4}>
    <FormControl fullWidth>
      <InputLabel id="method-select-label">Brewing Method</InputLabel>
      <MethodDropdown brewingMethod={brewingMethod} onChange={onChange} />
    </FormControl>

    {brewingMethod && (
      <Box sx={{ mt: 2 }}>
        <Chip
          label={brewingMethod}
          color="secondary"
          size="small"
        />
      </Box>
    )}
  </Grid>
);

/** Props for {@link SelectionSummary}. */
interface SelectionSummaryProps {
  /** The currently selected bean, if any. */
  selectedBean?: Bean;
  /** The currently selected grinder, if any. */
  selectedGrinder?: Grinder;
  /** The currently selected brewing method. */
  brewingMethod: BrewingMethod | '';
}

/** A compact summary of the current bean / grinder / method selection. */
const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectedBean,
  selectedGrinder,
  brewingMethod,
}) => (
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
      {brewingMethod && (
        <Grid item xs={12} sm={4}>
          <Typography variant="body2">
            <strong>Method:</strong> {brewingMethod}
          </Typography>
        </Grid>
      )}
    </Grid>
  </Box>
);

/**
 * The equipment-selection step of the brew workflow. Lets the user pick a
 * coffee bean, a grinder and a brewing method, surfaces freshness / range
 * chips for the current choices, and shows a combined selection summary.
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
    // The Select only renders BREWING_METHODS values, so the chosen value is a
    // BrewingMethod; narrow the generic string event value to the union.
    updateFormData({ brewingMethod: event.target.value as BrewingMethod });
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
        <BeanSelectColumn
          beans={beans}
          beanId={formData.beanId}
          selectedBean={selectedBean}
          onChange={handleBeanChange}
        />

        {/* Grinder Selection */}
        <GrinderSelectColumn
          grinders={grinders}
          grinderId={formData.grinderId}
          selectedGrinder={selectedGrinder}
          onChange={handleGrinderChange}
        />

        {/* Brewing Method Selection */}
        <MethodSelectColumn
          brewingMethod={formData.brewingMethod}
          onChange={handleMethodChange}
        />
      </Grid>

      {/* Selection Summary */}
      {(selectedBean || selectedGrinder || formData.brewingMethod) && (
        <SelectionSummary
          selectedBean={selectedBean}
          selectedGrinder={selectedGrinder}
          brewingMethod={formData.brewingMethod}
        />
      )}
    </Box>
  );
}
