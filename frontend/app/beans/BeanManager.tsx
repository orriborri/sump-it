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

/**
 * Renders the edit, history and delete action buttons for a bean row.
 *
 * @param props - The actions props.
 * @param props.onEdit - Invoked to edit the bean.
 * @param props.onHistory - Invoked to view the bean's usage history.
 * @param props.onDelete - Invoked to soft-delete the bean.
 * @returns The rendered bean row actions.
 */
const BeanActions: React.FC<{
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}> = ({ onEdit, onHistory, onDelete }) => (
  <Stack direction="row" spacing={1}>
    <Button size="small" onClick={onEdit}>
      Edit
    </Button>
    <Button size="small" onClick={onHistory}>
      History
    </Button>
    <Button size="small" color="error" onClick={onDelete}>
      Delete
    </Button>
  </Stack>
);

/**
 * Renders a bean row's primary line: the bean name alongside a freshness chip.
 *
 * @param props - The primary-line props.
 * @param props.name - The bean name.
 * @param props.fresh - Whether the bean is still within the freshness window.
 * @returns The rendered primary line.
 */
const BeanPrimary: React.FC<{ name: string; fresh: boolean }> = ({ name, fresh }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <span>{name}</span>
    <Chip
      size="small"
      label={fresh ? 'Fresh' : 'Aged'}
      color={fresh ? 'success' : 'default'}
    />
  </Stack>
);

/**
 * Renders a single bean as a list item with its freshness chip, origin and
 * remaining grams, plus the edit, history and delete actions.
 *
 * @param props - The list-item props.
 * @param props.bean - The bean to render.
 * @param props.fresh - Whether the bean is still within the freshness window.
 * @param props.onEdit - Invoked to edit the bean.
 * @param props.onHistory - Invoked to view the bean's usage history.
 * @param props.onDelete - Invoked to soft-delete the bean.
 * @returns The rendered bean list item.
 */
const BeanListItem: React.FC<{
  bean: CoffeeBean;
  fresh: boolean;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}> = ({ bean, fresh, onEdit, onHistory, onDelete }) => (
  <ListItem
    divider
    secondaryAction={
      <BeanActions onEdit={onEdit} onHistory={onHistory} onDelete={onDelete} />
    }
  >
    <ListItemText
      primary={<BeanPrimary name={bean.name} fresh={fresh} />}
      secondary={`${bean.origin} • ${formatRemaining(bean.remainingGrams)}`}
    />
  </ListItem>
);

/**
 * Renders the add/edit bean form fields: an optional validation error followed
 * by the name, origin, date, quantity and metadata inputs.
 *
 * @param props - The form-fields props.
 * @param props.form - The current form state.
 * @param props.formError - The current validation or server error, if any.
 * @param props.updateField - Updates a single form field.
 * @returns The rendered form fields.
 */
const BeanFormFields: React.FC<{
  form: BeanFormState;
  formError: string | null;
  updateField: (field: keyof BeanFormState, value: string) => void;
}> = ({ form, formError, updateField }) => (
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
);

/**
 * Renders the add/edit bean dialog wrapping the form fields and the cancel and
 * save actions.
 *
 * @param props - The dialog props.
 * @param props.open - Whether the dialog is open.
 * @param props.editingId - The id being edited, or null when adding.
 * @param props.form - The current form state.
 * @param props.formError - The current validation or server error, if any.
 * @param props.updateField - Updates a single form field.
 * @param props.onClose - Invoked to close the dialog.
 * @param props.onSubmit - Invoked to submit the form.
 * @returns The rendered editor dialog.
 */
const BeanEditorDialog: React.FC<{
  open: boolean;
  editingId: string | null;
  form: BeanFormState;
  formError: string | null;
  updateField: (field: keyof BeanFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ open, editingId, form, formError, updateField, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{editingId === null ? 'Add Bean' : 'Edit Bean'}</DialogTitle>
    <DialogContent>
      <BeanFormFields form={form} formError={formError} updateField={updateField} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={onSubmit}>
        Save
      </Button>
    </DialogActions>
  </Dialog>
);

/**
 * Renders the usage-history records as a list of brew entries.
 *
 * @param props - The usage-list props.
 * @param props.records - The usage records to render.
 * @returns The rendered usage list.
 */
const UsageList: React.FC<{ records: BeanUsageRecord[] }> = ({ records }) => (
  <List>
    {records.map(record => (
      <ListItem key={record.sessionId} divider>
        <ListItemText
          primary={`${formatUsageDate(record)} • ${record.gramsUsed}g • ${record.brewingMethod}`}
          secondary={`Grinder: ${record.grinderUsed} • Rating: ${formatUsageRating(record.rating)}`}
        />
      </ListItem>
    ))}
  </List>
);

/**
 * Renders the per-bean usage-history dialog, showing an empty state or the
 * list of brew records.
 *
 * @param props - The dialog props.
 * @param props.beanName - The name of the bean whose history is shown.
 * @param props.usage - The usage records, or null when the dialog is closed.
 * @param props.onClose - Invoked to close the dialog.
 * @returns The rendered usage-history dialog.
 */
const UsageDialog: React.FC<{
  beanName: string;
  usage: BeanUsageRecord[] | null;
  onClose: () => void;
}> = ({ beanName, usage, onClose }) => (
  <Dialog open={usage !== null} onClose={onClose}>
    <DialogTitle>{`Usage history: ${beanName}`}</DialogTitle>
    <DialogContent>
      {usage !== null && usage.length === 0 ? (
        <Alert severity="info">No brewing sessions yet.</Alert>
      ) : (
        <UsageList records={usage ?? []} />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

/**
 * Coffee bean inventory manager: lists active beans, adds, edits and
 * soft-deletes beans, shows freshness and remaining grams, and displays
 * per-bean usage history. All data flows through the injected typed client.
 *
 * @param props - The component props.
 * @param props.client - Injected bean client; defaults to the real typed client.
 * @param props.now - Injected clock; defaults to the real current time.
 * @returns The rendered bean inventory manager.
 */
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
            <BeanListItem
              key={bean.id}
              bean={bean}
              fresh={isFresh(bean.roastDate, now())}
              onEdit={() => openEdit(bean)}
              onHistory={() => viewUsage(bean)}
              onDelete={() => deleteBean(bean)}
            />
          ))}
        </List>
      )}

      <BeanEditorDialog
        open={editorOpen}
        editingId={editingId}
        form={form}
        formError={formError}
        updateField={updateField}
        onClose={closeEditor}
        onSubmit={submitForm}
      />

      <UsageDialog beanName={usageBeanName} usage={usage} onClose={closeUsage} />
    </Box>
  );
}
