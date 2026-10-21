// Brewing-session history with filter, search and duplicate (ticket #146).
//
// Wired through the injected typed client (`coffeeBrewerClient.sessions`) so
// the whole flow uses the ts-rs generated contract with no `any`. The client is
// injected via props (defaulting to the real client) so tests supply a fake and
// drive every branch to 100% coverage. All pure logic (param building, paging,
// formatting) lives in `lib/sessions/history.ts`; this component is a thin shell
// that wires it to MUI.
//
// The coffee theme (#8B4513 brown) and single-column layout match
// BrewWorkflow / BeanManager / GrinderManager.
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

import { coffeeBrewerClient, type ApiResponse, type SessionListParams } from '@/lib/trpc/client';
import type { BrewingSession, PaginatedResponse } from '@/lib/api/types';
import {
  GRINDER_TYPE_OPTIONS,
  METHOD_OPTIONS,
  buildListParams,
  emptyFilterForm,
  formatRating,
  formatRatio,
  hasNextPage,
  hasPrevPage,
  methodLabel,
  pageSummary,
  type SessionFilterForm,
} from '@/lib/sessions/history';

/** The subset of the typed client this component depends on. */
export interface SessionHistoryClient {
  list: (params?: SessionListParams) => Promise<ApiResponse<PaginatedResponse<BrewingSession>>>;
  duplicate: (id: string) => Promise<ApiResponse<BrewingSession>>;
}

/** Props for {@link SessionHistory}. */
export interface SessionHistoryProps {
  /** Injectable client; defaults to the real typed REST client. */
  client?: SessionHistoryClient;
}

/** The grinder-type filter dropdown ("Any" plus one option per type). */
const GrinderTypeFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <FormControl fullWidth>
    <InputLabel id="grinder-type-filter-label">Grinder Type</InputLabel>
    <Select
      labelId="grinder-type-filter-label"
      label="Grinder Type"
      value={value}
      inputProps={{ 'aria-label': 'Grinder Type' }}
      onChange={(e) => onChange(e.target.value)}
    >
      <MenuItem value="">Any</MenuItem>
      {GRINDER_TYPE_OPTIONS.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

/** The brewing-method filter dropdown ("Any" plus one option per method). */
const MethodFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <FormControl fullWidth>
    <InputLabel id="method-filter-label">Brewing Method</InputLabel>
    <Select
      labelId="method-filter-label"
      label="Brewing Method"
      value={value}
      inputProps={{ 'aria-label': 'Brewing Method' }}
      onChange={(e) => onChange(e.target.value)}
    >
      <MenuItem value="">Any</MenuItem>
      {METHOD_OPTIONS.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

/** Props for {@link FilterPanel}. */
interface FilterPanelProps {
  /** The current filter form values. */
  form: SessionFilterForm;
  /** Updates a single filter field. */
  updateField: <K extends keyof SessionFilterForm>(key: K, value: SessionFilterForm[K]) => void;
  /** Clears all filters back to their empty state. */
  onReset: () => void;
}

/** The filter and search panel: text inputs, date range, dropdowns and reset. */
const FilterPanel: React.FC<FilterPanelProps> = ({ form, updateField, onReset }) => (
  <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
      Filter &amp; Search
    </Typography>
    <Stack spacing={2}>
      <TextField
        label="Search"
        placeholder="bean, origin, grinder or notes"
        value={form.search}
        onChange={(e) => updateField('search', e.target.value)}
        inputProps={{ 'aria-label': 'Search' }}
        fullWidth
      />
      <TextField
        label="Bean Origin"
        value={form.beanOrigin}
        onChange={(e) => updateField('beanOrigin', e.target.value)}
        inputProps={{ 'aria-label': 'Bean Origin' }}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Roast Date From"
          type="date"
          value={form.roastDateFrom}
          onChange={(e) => updateField('roastDateFrom', e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': 'Roast Date From' }}
          fullWidth
        />
        <TextField
          label="Roast Date To"
          type="date"
          value={form.roastDateTo}
          onChange={(e) => updateField('roastDateTo', e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': 'Roast Date To' }}
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <GrinderTypeFilter
          value={form.grinderType}
          onChange={(value) => updateField('grinderType', value)}
        />
        <MethodFilter
          value={form.brewingMethod}
          onChange={(value) => updateField('brewingMethod', value)}
        />
      </Stack>
      <TextField
        label="Minimum Rating"
        type="number"
        value={form.ratingMin}
        onChange={(e) => updateField('ratingMin', e.target.value)}
        inputProps={{ 'aria-label': 'Minimum Rating', min: 1, max: 10, step: 0.5 }}
        fullWidth
      />
      <Box>
        <Button variant="outlined" onClick={onReset}>
          Clear Filters
        </Button>
      </Box>
    </Stack>
  </Paper>
);

/** Props for {@link SessionChips}. */
interface SessionChipsProps {
  /** The session whose chips to render. */
  session: BrewingSession;
}

/** The ratio / rating / dose chips shown for a single session. */
const SessionChips: React.FC<SessionChipsProps> = ({ session }) => (
  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
    <Chip
      label={formatRatio(session.coffeeGrams, session.waterGrams, session.coffeeRatio)}
      color="primary"
      size="small"
    />
    <Chip label={formatRating(session.rating)} color="info" size="small" />
    <Chip
      label={`${session.coffeeGrams}g : ${session.waterGrams}g`}
      size="small"
    />
  </Stack>
);

/** Props for {@link SessionCard}. */
interface SessionCardProps {
  /** The session this card represents. */
  session: BrewingSession;
  /** Duplicates the session by id. */
  onDuplicate: (id: string) => void;
}

/** A single session row: method, chips, tasting notes and a Duplicate action. */
const SessionCard: React.FC<SessionCardProps> = ({ session, onDuplicate }) => (
  <Paper elevation={1} sx={{ p: 2 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1}
    >
      <Box>
        <Typography variant="subtitle1">
          {methodLabel(session.brewingMethod)}
        </Typography>
        <SessionChips session={session} />
        {session.tastingNotes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {session.tastingNotes}
          </Typography>
        )}
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={() => void onDuplicate(session.id)}
      >
        Duplicate
      </Button>
    </Stack>
  </Paper>
);

/** Props for {@link SessionList}. */
interface SessionListProps {
  /** Whether the list is still loading. */
  loading: boolean;
  /** The sessions on the current page. */
  sessions: BrewingSession[];
  /** The total number of sessions matching the filters. */
  total: number;
  /** The current zero-based page index. */
  page: number;
  /** Duplicates a session by id. */
  onDuplicate: (id: string) => void;
  /** Moves to the previous page. */
  onPrev: () => void;
  /** Moves to the next page. */
  onNext: () => void;
}

/**
 * The sessions result list: a spinner while loading, an empty-state hint, or a
 * page summary, one {@link SessionCard} per session, and the paging controls.
 */
const SessionList: React.FC<SessionListProps> = ({
  loading,
  sessions,
  total,
  page,
  onDuplicate,
  onPrev,
  onNext,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (sessions.length === 0) {
    return <Alert severity="info">No sessions match your filters yet.</Alert>;
  }
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {pageSummary(total, page, sessions.length)}
      </Typography>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onDuplicate={onDuplicate} />
      ))}

      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          disabled={!hasPrevPage(page)}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          variant="outlined"
          disabled={!hasNextPage(total, page)}
          onClick={onNext}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
};

/**
 * Brewing-session history with filter, search and duplicate, wired through the
 * injected typed client (`coffeeBrewerClient.sessions`). Pure logic (param
 * building, paging, formatting) lives in `lib/sessions/history.ts`; this
 * component is the MUI shell that wires it together.
 */
export function SessionHistory({
  client = coffeeBrewerClient.sessions,
}: SessionHistoryProps) {
  const [form, setForm] = useState<SessionFilterForm>(emptyFilterForm());
  const [page, setPage] = useState(0);
  const [sessions, setSessions] = useState<BrewingSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await client.list(buildListParams(form, page));
    if (response.error) {
      setError(response.error);
      setSessions([]);
      setTotal(0);
    } else {
      setError(null);
      setSessions(response.data?.items ?? []);
      setTotal(response.data?.total ?? 0);
    }
    setLoading(false);
  }, [client, form, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = <K extends keyof SessionFilterForm>(
    key: K,
    value: SessionFilterForm[K],
  ) => {
    // Any filter change resets to the first page so results stay coherent.
    setPage(0);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setPage(0);
    setForm(emptyFilterForm());
  };

  const handleDuplicate = async (id: string) => {
    setNotice(null);
    const response = await client.duplicate(id);
    if (response.error) {
      setError(response.error);
      return;
    }
    setError(null);
    setNotice('Session duplicated. The recipe was re-brewed and inventory updated.');
    // Reflect the new session (and the decremented inventory) by reloading.
    await load();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#8B4513', fontWeight: 600 }}>
        Brewing Session History
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse your past brews newest-first. Filter and search to find a recipe,
        then duplicate it to brew it again.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <FilterPanel form={form} updateField={updateField} onReset={resetFilters} />

      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Sessions
      </Typography>

      <SessionList
        loading={loading}
        sessions={sessions}
        total={total}
        page={page}
        onDuplicate={handleDuplicate}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </Box>
  );
}
