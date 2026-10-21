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

/** Props for {@link BeanManager}. */
export interface BeanManagerProps {
  /** Injected bean client; defaults to the real typed client. */
  client?: BeanClient;
  /** Injected clock; defaults to the real current time. */
  now?: () => Date;
}

/** Props for {@link BeanListItem}. */
interface BeanListItemProps {
  /** The bean this row represents. */
  bean: CoffeeBean;
  /** Clock accessor used to compute freshness. */
  now: () => Date;
  /** Starts editing the given bean. */
  onEdit: (bean: CoffeeBean) => void;
  /** Opens the usage history for the given bean. */
  onViewUsage: (bean: CoffeeBean) => void;
  /** Deletes the given bean. */
  onDelete: (bean: CoffeeBean) => void;
}

/**
 * A single bean row: name with a Fresh/Aged chip and origin/remaining summary,
 * plus Edit / History / Delete actions.
 */
const BeanListItem: React.FC<BeanListItemProps> = ({
  bean,
  now,
  onEdit,
  onViewUsage,
  onDelete,
}) => (
  <ListItem
    divider
    secondaryAction={
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => onEdit(bean)}>
          Edit
        </Button>
        <Button size="small" onClick={() => onViewUsage(bean)}>
          History
        </Button>
        <Button
          size="small"
          color="error"
          onClick={() => onDelete(bean)}
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
);

/** Props for {@link BeanList}. */
interface BeanListProps {
  /** Whether the bean list is still loading. */
  loading: boolean;
  /** The active beans to display. */
  beans: CoffeeBean[];
  /** Clock accessor used to compute freshness. */
  now: () => Date;
  /** Starts editing the given bean. */
  onEdit: (bean: CoffeeBean) => void;
  /** Opens the usage history for the given bean. */
  onViewUsage: (bean: CoffeeBean) => void;
  /** Deletes the given bean. */
  onDelete: (bean: CoffeeBean) => void;
}

/**
 * The active-bean list: a spinner while loading, an empty-state hint, or one
 * {@link BeanListItem} per bean.
 */
const BeanList: React.FC<BeanListProps> = ({
  loading,
  beans,
  now,
  onEdit,
  onViewUsage,
  onDelete,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (beans.length === 0) {
    return <Alert severity="info">No active beans. Add your first bag.</Alert>;
  }
  return (
    <List>
      {beans.map(bean => (
        <BeanListItem
          key={bean.id}
          bean={bean}
          now={now}
          onEdit={onEdit}
          onViewUsage={onViewUsage}
          onDelete={onDelete}
        />
      ))}
    </List>
  );
};

/** Props for {@link BeanEditorDialog}. */
interface BeanEditorDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Whether an existing bean is being edited (vs. adding a new one). */
  editingId: string | null;
  /** The current editable form state. */
  form: BeanFormState;
  /** A validation/save error to surface, if any. */
  formError: string | null;
  /** Updates a single form field. */
  updateField: (field: keyof BeanFormState, value: string) => void;
  /** Closes the dialog without saving. */
  onClose: () => void;
  /** Submits the add/edit form. */
  onSubmit: () => void;
}

/** The add/edit bean dialog with all the bean input fields. */
const BeanEditorDialog: React.FC<BeanEditorDialogProps> = ({
  open,
  editingId,
  form,
  formError,
  updateField,
  onClose,
  onSubmit,
}) => (
  <Dialog open={open} onClose={onClose}>
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
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={onSubmit}>
        Save
      </Button>
    </DialogActions>
  </Dialog>
);

/** Props for {@link UsageDialog}. */
interface UsageDialogProps {
  /** The usage records to show, or null when the dialog is closed. */
  usage: BeanUsageRecord[] | null;
  /** The name of the bean whose usage is shown. */
  beanName: string;
  /** Closes the dialog. */
  onClose: () => void;
}

/** The list of usage records, or an empty-state hint when there are none. */
const UsageList: React.FC<{ usage: BeanUsageRecord[] }> = ({ usage }) => {
  if (usage.length === 0) {
    return <Alert severity="info">No brewing sessions yet.</Alert>;
  }
  return (
    <List>
      {usage.map(record => (
        <ListItem key={record.sessionId} divider>
          <ListItemText
            primary={`${formatUsageDate(record)} • ${record.gramsUsed}g • ${record.brewingMethod}`}
            secondary={`Grinder: ${record.grinderUsed} • Rating: ${formatUsageRating(record.rating)}`}
          />
        </ListItem>
      ))}
    </List>
  );
};

/** The per-bean usage-history dialog listing each brewing session. */
const UsageDialog: React.FC<UsageDialogProps> = ({ usage, beanName, onClose }) => (
  <Dialog open={usage !== null} onClose={onClose}>
    <DialogTitle>{`Usage history: ${beanName}`}</DialogTitle>
    <DialogContent>
      <UsageList usage={usage ?? []} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

/**
 * Coffee bean inventory management: list active beans, add/edit/soft-delete a
 * bean, show freshness and remaining grams, and view per-bean usage history.
 * All data flows through the injected typed client (`coffeeBrewerClient`).
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

      <BeanList
        loading={loading}
        beans={beans}
        now={now}
        onEdit={openEdit}
        onViewUsage={viewUsage}
        onDelete={deleteBean}
      />

      <BeanEditorDialog
        open={editorOpen}
        editingId={editingId}
        form={form}
        formError={formError}
        updateField={updateField}
        onClose={closeEditor}
        onSubmit={submitForm}
      />

      <UsageDialog usage={usage} beanName={usageBeanName} onClose={closeUsage} />
    </Box>
  );
}
