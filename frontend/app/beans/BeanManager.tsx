// Coffee bean inventory management (ticket #142).
//
// End-to-end bean management: list active beans, add a bean, edit a bean,
// soft-delete a bean, show freshness and remaining grams, and view per-bean
// usage history. All data flows through the typed client
// (`coffeeBrewerClient`), which is injected so tests can supply a fake with no
// network.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { coffeeBrewerClient } from '@/lib/trpc/client';
import type { BeanUsageRecord, CoffeeBean } from '@/lib/api/types';
import {
  beanToForm,
  emptyBeanForm,
  formatRemaining,
  formatUsageDate,
  formatUsageRating,
  formToRequest,
  isFresh,
  validateBeanForm,
  type BeanFormState,
} from '@/lib/beans/inventory';

/** The subset of the typed client this component needs. */
export type BeanClient = typeof coffeeBrewerClient.beans;

export interface BeanManagerProps {
  /** Injected bean client; defaults to the real typed client. */
  client?: BeanClient;
  /** Injected clock; defaults to the real current time. */
  now?: () => Date;
}

export function BeanManager({
  client = coffeeBrewerClient.beans,
  now = () => new Date(),
}: BeanManagerProps) {
  const [beans, setBeans] = useState<CoffeeBean[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor dialog state. `editingId` null means "adding a new bean".
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BeanFormState>(emptyBeanForm());
  const [formError, setFormError] = useState<string | null>(null);

  // Usage-history dialog state.
  const [usage, setUsage] = useState<BeanUsageRecord[] | null>(null);
  const [usageBeanName, setUsageBeanName] = useState('');

  const loadBeans = useCallback(async () => {
    setLoading(true);
    const response = await client.getActive();
    if (response.error) {
      setError(response.error);
      setBeans([]);
    } else {
      setError(null);
      setBeans(response.data ?? []);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadBeans();
  }, [loadBeans]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyBeanForm());
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (bean: CoffeeBean) => {
    setEditingId(bean.id);
    setForm(beanToForm(bean));
    setFormError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const updateField = (field: keyof BeanFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const submitForm = async () => {
    const validationError = validateBeanForm(form, now());
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }

    const request = formToRequest(form);
    const response =
      editingId === null
        ? await client.create(request)
        : await client.update(editingId, request);

    if (response.error) {
      setFormError(response.error);
      return;
    }

    setEditorOpen(false);
    await loadBeans();
  };

  const deleteBean = async (bean: CoffeeBean) => {
    const response = await client.delete(bean.id);
    if (response.error) {
      setError(response.error);
      return;
    }
    await loadBeans();
  };

  const viewUsage = async (bean: CoffeeBean) => {
    const response = await client.getUsage(bean.id);
    if (response.error) {
      setError(response.error);
      return;
    }
    setUsageBeanName(bean.name);
    setUsage(response.data ?? []);
  };

  const closeUsage = () => {
    setUsage(null);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600 }}>
          Coffee Bean Inventory
        </Typography>
        <Button variant="contained" onClick={openAdd}>
          Add Bean
        </Button>
      </Stack>

      {error !== null && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Box>
      ) : beans.length === 0 ? (
        <Alert severity="info">No active beans. Add your first bag.</Alert>
      ) : (
        <List>
          {beans.map(bean => (
            <ListItem
              key={bean.id}
              divider
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => openEdit(bean)}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => viewUsage(bean)}>
                    History
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => deleteBean(bean)}
                  >
                    Delete
                  </Button>
                </Stack>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{bean.name}</span>
                    <Chip
                      size="small"
                      label={isFresh(bean.roastDate, now()) ? 'Fresh' : 'Aged'}
                      color={isFresh(bean.roastDate, now()) ? 'success' : 'default'}
                    />
                  </Stack>
                }
                secondary={`${bean.origin} • ${formatRemaining(bean.remainingGrams)}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={editorOpen} onClose={closeEditor}>
        <DialogTitle>{editingId === null ? 'Add Bean' : 'Edit Bean'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError !== null && (
              <Alert severity="error" role="alert">
                {formError}
              </Alert>
            )}
            <TextField
              label="Name"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
            />
            <TextField
              label="Origin"
              value={form.origin}
              onChange={e => updateField('origin', e.target.value)}
            />
            <TextField
              label="Roast date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.roastDate}
              onChange={e => updateField('roastDate', e.target.value)}
            />
            <TextField
              label="Purchase date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.purchaseDate}
              onChange={e => updateField('purchaseDate', e.target.value)}
            />
            <TextField
              label="Remaining grams"
              value={form.remainingGrams}
              onChange={e => updateField('remainingGrams', e.target.value)}
            />
            <TextField
              label="Variety"
              value={form.variety}
              onChange={e => updateField('variety', e.target.value)}
            />
            <TextField
              label="Processing method"
              value={form.processingMethod}
              onChange={e => updateField('processingMethod', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor}>Cancel</Button>
          <Button variant="contained" onClick={submitForm}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={usage !== null} onClose={closeUsage}>
        <DialogTitle>{`Usage history: ${usageBeanName}`}</DialogTitle>
        <DialogContent>
          {usage !== null && usage.length === 0 ? (
            <Alert severity="info">No brewing sessions yet.</Alert>
          ) : (
            <List>
              {(usage ?? []).map(record => (
                <ListItem key={record.sessionId} divider>
                  <ListItemText
                    primary={`${formatUsageDate(record)} • ${record.gramsUsed}g • ${record.brewingMethod}`}
                    secondary={`Grinder: ${record.grinderUsed} • Rating: ${formatUsageRating(record.rating)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUsage}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
