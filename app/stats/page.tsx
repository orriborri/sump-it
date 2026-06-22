'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Rating,
  Stack,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useEffect, useState } from 'react'
import { deleteBrew, getBrews } from './actions'

type BrewResult = Awaited<ReturnType<typeof getBrews>>[number]

/**
 * Card component for displaying a single brew record on mobile devices.
 * Shows brew details including date, bean, method, grinder, parameters,
 * taste feedback chips, and a delete button.
 */
function BrewCard({
  brew,
  onDelete,
}: {
  brew: BrewResult
  onDelete: (_id: number) => void
}) {
  return (
    <Card
      sx={{
        bgcolor: '#F5F5DC',
        border: '1px solid #8B4513',
        color: '#654321',
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle2" sx={{ color: '#654321' }}>
              {new Date(brew.created_at).toLocaleDateString()}
            </Typography>
            <IconButton
              onClick={() => onDelete(brew.id)}
              color="error"
              size="small"
              aria-label="delete"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>

          <Typography variant="h6" sx={{ color: '#8B4513' }}>
            {brew.bean_name}
          </Typography>

          <Typography variant="body2" sx={{ color: '#654321' }}>
            {brew.method_name} &middot; {brew.grinder_name}
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ color: '#654321' }}>
              Grind: {brew.grind}
            </Typography>
            <Typography variant="body2" sx={{ color: '#654321' }}>
              Dose: {brew.dose}g
            </Typography>
            <Typography variant="body2" sx={{ color: '#654321' }}>
              Water: {brew.water}g
            </Typography>
            <Typography variant="body2" sx={{ color: '#654321' }}>
              Ratio: {brew.ratio}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {brew.too_strong && (
              <Chip label="Too Strong" size="small" color="error" />
            )}
            {brew.too_weak && (
              <Chip label="Too Weak" size="small" color="warning" />
            )}
            {brew.is_sour && <Chip label="Sour" size="small" color="info" />}
            {brew.is_bitter && (
              <Chip label="Bitter" size="small" color="secondary" />
            )}
          </Stack>

          {brew.overall_rating !== null && (
            <Rating value={brew.overall_rating} readOnly size="small" />
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

/**
 * Statistics page component that displays brew history.
 * Renders a responsive table (desktop) or card list (mobile) of all brews
 * with filtering options and delete confirmation dialogs.
 * Fetches data client-side and supports loading/error states.
 */
const StatsTable = () => {
  const [items, setItems] = useState<BrewResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [brewToDelete, setBrewToDelete] = useState<number | null>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true })

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const brews = await getBrews()
        setItems(brews)
        setLoading(false)
      } catch {
        setError('Failed to load brew history')
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  const handleDelete = (id: number) => {
    setBrewToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (brewToDelete === null) return
    try {
      await deleteBrew(brewToDelete)
      const brews = await getBrews()
      setItems(brews)
    } catch {
      setError('Failed to delete brew')
    }
    setDeleteDialogOpen(false)
    setBrewToDelete(null)
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Statistics
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#8B4513' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      ) : items.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ color: '#654321', textAlign: 'center', py: 4 }}
        >
          No brews logged yet. Start brewing to see your stats here!
        </Typography>
      ) : isMobile ? (
        <Stack spacing={2}>
          {items.map(brew => (
            <BrewCard key={brew.id} brew={brew} onDelete={handleDelete} />
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Bean</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Grinder</TableCell>
                <TableCell align="right">Grind Size</TableCell>
                <TableCell align="right">Water (g)</TableCell>
                <TableCell align="right">Dose (g)</TableCell>
                <TableCell align="right">Ratio</TableCell>
                <TableCell align="center">Feedback</TableCell>
                <TableCell align="center">Rating</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(brew => (
                <TableRow key={brew.id} hover>
                  <TableCell>
                    {new Date(brew.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{brew.bean_name}</TableCell>
                  <TableCell>{brew.method_name}</TableCell>
                  <TableCell>{brew.grinder_name}</TableCell>
                  <TableCell align="right">{brew.grind}</TableCell>
                  <TableCell align="right">{brew.water}</TableCell>
                  <TableCell align="right">{brew.dose}</TableCell>
                  <TableCell align="right">{brew.ratio}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {brew.too_strong && (
                        <Chip label="Too Strong" size="small" color="error" />
                      )}
                      {brew.too_weak && (
                        <Chip label="Too Weak" size="small" color="warning" />
                      )}
                      {brew.is_sour && (
                        <Chip label="Sour" size="small" color="info" />
                      )}
                      {brew.is_bitter && (
                        <Chip label="Bitter" size="small" color="secondary" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {brew.overall_rating !== null && (
                      <Rating
                        value={brew.overall_rating}
                        readOnly
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={() => handleDelete(brew.id)}
                      color="error"
                      size="small"
                      aria-label="delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ color: '#8B4513' }}>Delete Brew</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this brew? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{ bgcolor: '#DC143C', '&:hover': { bgcolor: '#B91C3C' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StatsTable
