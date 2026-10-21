// End-to-end grinder management UI (list / add / edit / remove).
//
// Wired through the typed REST client (`coffeeBrewerClient.grinders`) so the
// whole flow uses the ts-rs generated contract with no `any`. The client is
// injected via props (defaulting to the real client) so tests can supply a
// fake and drive every branch to 100% coverage. The max>min validation is
// surfaced both client-side (before the request) and from the API error
// response.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { coffeeBrewerClient } from '@/lib/trpc/client';
import type { CreateGrinderRequest, Grinder } from '@/lib/api/types';
import type { ApiResponse } from '@/lib/trpc/client';
import {
  GRINDER_TYPES,
  emptyGrinderForm,
  toCreateGrinderRequest,
  validateGrinderForm,
  type GrinderFormState,
} from '@/lib/grinders/validation';

/** The subset of the typed client this component depends on. */
export interface GrindersClient {
  list: () => Promise<ApiResponse<{ items: Grinder[] }>>;
  create: (data: CreateGrinderRequest) => Promise<ApiResponse<Grinder>>;
  update: (id: string, data: CreateGrinderRequest) => Promise<ApiResponse<Grinder>>;
  delete: (id: string) => Promise<ApiResponse<void>>;
}

export interface GrinderManagerProps {
  /** Injectable client; defaults to the real typed REST client. */
  client?: GrindersClient;
}

/** Build the editable form state from an existing grinder. */
function formFromGrinder(grinder: Grinder): GrinderFormState {
  return {
    brand: grinder.brand,
    model: grinder.model,
    grinderType: grinder.grinderType,
    minSetting: grinder.minSetting,
    maxSetting: grinder.maxSetting,
    scaleType: grinder.scaleType ?? '',
    description: grinder.description ?? '',
  };
}

/**
 * Grinder management UI: lists grinders and adds, edits and removes them
 * through the injected typed client. The max-greater-than-min rule is enforced
 * client-side before the request and also surfaced from the API error.
 *
 * @param props - The component props.
 * @param props.client - Injected grinders client; defaults to the real typed client.
 * @returns The rendered grinder manager.
 */
export function GrinderManager({
  client = coffeeBrewerClient.grinders,
}: GrinderManagerProps) {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GrinderFormState>(emptyGrinderForm());
  const [saving, setSaving] = useState(false);

  const loadGrinders = useCallback(async () => {
    setLoading(true);
    const response = await client.list();
    if (response.error) {
      setError(response.error);
      setGrinders([]);
    } else {
      setError(null);
      setGrinders(response.data?.items ?? []);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadGrinders();
  }, [loadGrinders]);

  const updateField = <K extends keyof GrinderFormState>(
    key: K,
    value: GrinderFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyGrinderForm());
    setEditingId(null);
    setError(null);
  };

  const startEdit = (grinder: Grinder) => {
    setForm(formFromGrinder(grinder));
    setEditingId(grinder.id);
    setError(null);
  };

  const handleSubmit = async () => {
    const message = validateGrinderForm(form);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    const payload = toCreateGrinderRequest(form);
    const response = editingId
      ? await client.update(editingId, payload)
      : await client.create(payload);
    setSaving(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    resetForm();
    await loadGrinders();
  };

  const handleDelete = async (id: string) => {
    const response = await client.delete(id);
    if (response.error) {
      setError(response.error);
      return;
    }
    await loadGrinders();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#8B4513', fontWeight: 600 }}>
        Grinder Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Add, edit, and remove the grinders you brew with. A grinder&apos;s maximum
        setting must be greater than its minimum.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
          {editingId ? 'Edit Grinder' : 'Add Grinder'}
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Brand"
            value={form.brand}
            onChange={(e) => updateField('brand', e.target.value)}
            inputProps={{ 'aria-label': 'Brand' }}
            fullWidth
          />
          <TextField
            label="Model"
            value={form.model}
            onChange={(e) => updateField('model', e.target.value)}
            inputProps={{ 'aria-label': 'Model' }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="grinder-type-label">Grinder Type</InputLabel>
            <Select
              labelId="grinder-type-label"
              label="Grinder Type"
              value={form.grinderType}
              inputProps={{ 'aria-label': 'Grinder Type' }}
              onChange={(e) => updateField('grinderType', e.target.value as GrinderFormState['grinderType'])}
            >
              {GRINDER_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Minimum Setting"
            type="number"
            value={form.minSetting}
            onChange={(e) => updateField('minSetting', Number(e.target.value))}
            inputProps={{ 'aria-label': 'Minimum Setting' }}
            fullWidth
          />
          <TextField
            label="Maximum Setting"
            type="number"
            value={form.maxSetting}
            onChange={(e) => updateField('maxSetting', Number(e.target.value))}
            inputProps={{ 'aria-label': 'Maximum Setting' }}
            fullWidth
          />
          <TextField
            label="Scale Type"
            value={form.scaleType}
            onChange={(e) => updateField('scaleType', e.target.value)}
            inputProps={{ 'aria-label': 'Scale Type' }}
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            inputProps={{ 'aria-label': 'Description' }}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {editingId ? 'Save Changes' : 'Add Grinder'}
            </Button>
            {editingId && (
              <Button variant="outlined" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Your Grinders
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : grinders.length === 0 ? (
        <Alert severity="info">No grinders yet. Add your first grinder above.</Alert>
      ) : (
        <Stack spacing={2}>
          {grinders.map((grinder) => (
            <Paper key={grinder.id} elevation={1} sx={{ p: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle1">
                    {grinder.brand} {grinder.model}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={grinder.grinderType} color="primary" size="small" />
                    <Chip
                      label={`Settings: ${grinder.minSetting}-${grinder.maxSetting}`}
                      color="info"
                      size="small"
                    />
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => startEdit(grinder)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => void handleDelete(grinder.id)}
                  >
                    Remove
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
