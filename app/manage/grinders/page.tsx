import React from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { Edit, Add } from '@mui/icons-material'
import Link from 'next/link'
import { db } from '@/app/lib/database'
import { GrindersModel } from '@/app/lib/generated-models/Grinders'
import { DeleteGrinderButton } from './DeleteGrinderButton'

// Force dynamic rendering since we need database access
export const dynamic = 'force-dynamic'

interface Grinder {
  id: number
  name: string | null
  min_setting: number | null
  max_setting: number | null
  step_size: number | null
  setting_type: string | null
}

interface GrinderRowProps {
  grinder: Grinder
}

const GrinderRow: React.FC<GrinderRowProps> = ({ grinder }) => (
  <TableRow
    sx={{ '&:hover': { bgcolor: 'rgba(160, 82, 45, 0.1)' } }}
  >
    <TableCell>
      <Typography variant="subtitle1" sx={{ color: '#8B4513', fontWeight: 600 }}>
        {grinder.name}
      </Typography>
    </TableCell>
    <TableCell>
      <Chip
        label={`${grinder.min_setting || 1} - ${grinder.max_setting || 40}`}
        size="small"
        sx={{ bgcolor: '#A0522D', color: 'white' }}
      />
    </TableCell>
    <TableCell>
      <Chip
        label={grinder.step_size || 1}
        size="small"
        sx={{ bgcolor: '#8B4513', color: 'white' }}
      />
    </TableCell>
    <TableCell>
      <Chip
        label={grinder.setting_type || 'numeric'}
        size="small"
        variant="outlined"
        sx={{ borderColor: '#A0522D', color: '#A0522D' }}
      />
    </TableCell>
    <TableCell>
      <Box display="flex" gap={1}>
        <IconButton 
          size="small" 
          component={Link} 
          href={`/manage/grinders/${grinder.id}/edit`}
          sx={{ color: '#A0522D' }}
        >
          <Edit fontSize="small" />
        </IconButton>
        <DeleteGrinderButton
          grinderId={grinder.id}
          grinderName={grinder.name || 'Unknown Grinder'}
        />
      </Box>
    </TableCell>
  </TableRow>
)

const GrindersTableHeader: React.FC = () => (
  <TableHead sx={{ bgcolor: '#A0522D' }}>
    <TableRow>
      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Grinder Name</TableCell>
      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Range</TableCell>
      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Step Size</TableCell>
      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
    </TableRow>
  </TableHead>
)

interface GrindersTableProps {
  grinders: Grinder[]
}

const GrindersTable: React.FC<GrindersTableProps> = ({ grinders }) => (
  <TableContainer 
    component={Paper} 
    sx={{ 
      bgcolor: '#F5F5DC', 
      border: '2px solid #A0522D',
      borderRadius: 2
    }}
  >
    <Table>
      <GrindersTableHeader />
      <TableBody>
        {grinders.map((grinder) => (
          <GrinderRow key={grinder.id} grinder={grinder} />
        ))}
      </TableBody>
    </Table>
  </TableContainer>
)

async function getGrinders() {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.findAll()
}

/** Grinders management page displaying all grinders in a table with edit/delete actions. */
export default async function GrindersPage() {
  const grinders = await getGrinders()

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600, flex: 1 }}>
          ⚙️ Your Grinders
        </Typography>
        <Button
          component={Link}
          href="/manage/grinders/new"
          variant="contained"
          startIcon={<Add />}
        >
          Add New Grinder
        </Button>
      </Box>

      <GrindersTable grinders={grinders} />

      {grinders.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 1 }}>
            No grinders yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first grinder to start tracking your coffee brewing setup
          </Typography>
          <Button
            component={Link}
            href="/manage/grinders/new"
            variant="contained"
            startIcon={<Add />}
          >
            Add Your First Grinder
          </Button>
        </Box>
      )}
    </Box>
  )
}
