import React from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { LocalCafe, ArrowBack, Edit, Delete } from '@mui/icons-material'
import Link from 'next/link'

const MethodsPage = () => {
  // Mock data - replace with actual data fetching
  const methods = [
    { id: 1, name: 'V60' },
    { id: 2, name: 'French Press' },
    { id: 3, name: 'AeroPress' },
    { id: 4, name: 'Chemex' },
    { id: 5, name: 'Espresso' },
  ]

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          component={Link}
          href="/manage"
          startIcon={<ArrowBack />}
          variant="outlined"
        >
          Back to Manage
        </Button>
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600 }}>
          ☕ Your Brew Methods
        </Typography>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: '#F5F5DC', 
          border: '2px solid #D2691E',
          borderRadius: 2
        }}
      >
        <Table>
          <TableHead sx={{ bgcolor: '#D2691E' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Method Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {methods.map((method) => (
              <TableRow 
                key={method.id}
                sx={{ '&:hover': { bgcolor: 'rgba(210, 105, 30, 0.1)' } }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocalCafe sx={{ color: '#D2691E' }} />
                    <Typography variant="subtitle1" sx={{ color: '#8B4513', fontWeight: 600 }}>
                      {method.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton 
                      size="small" 
                      component={Link} 
                      href={`/manage/methods/${method.id}/edit`}
                      sx={{ color: '#D2691E' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      sx={{ color: '#DC143C' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {methods.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 1 }}>
            No brew methods yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first brewing method to start tracking your coffee setup
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default MethodsPage
