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
import { Coffee, ArrowBack, Edit, Delete } from '@mui/icons-material'
import Link from 'next/link'

const BeansPage = () => {
  // Mock data - replace with actual data fetching
  const beans = [
    { id: 1, name: 'Ethiopian Yirgacheffe', roaster: 'Blue Bottle', origin: 'Ethiopia', roast_level: 'Light' },
    { id: 2, name: 'Colombian Supremo', roaster: 'Stumptown', origin: 'Colombia', roast_level: 'Medium' },
    { id: 3, name: 'Brazilian Santos', roaster: 'Counter Culture', origin: 'Brazil', roast_level: 'Dark' },
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
          ☕ Your Coffee Beans
        </Typography>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: '#F5F5DC', 
          border: '2px solid #8B4513',
          borderRadius: 2
        }}
      >
        <Table>
          <TableHead sx={{ bgcolor: '#8B4513' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bean Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Roaster</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Origin</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Roast Level</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {beans.map((bean) => (
              <TableRow 
                key={bean.id}
                sx={{ '&:hover': { bgcolor: 'rgba(139, 69, 19, 0.1)' } }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Coffee sx={{ color: '#8B4513' }} />
                    <Typography variant="subtitle1" sx={{ color: '#8B4513', fontWeight: 600 }}>
                      {bean.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {bean.roaster}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {bean.origin}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={bean.roast_level} 
                    size="small" 
                    sx={{ bgcolor: '#8B4513', color: 'white' }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton 
                      size="small" 
                      component={Link} 
                      href={`/manage/beans/${bean.id}/edit`}
                      sx={{ color: '#8B4513' }}
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

      {beans.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 1 }}>
            No coffee beans yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first coffee bean to start tracking your collection
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default BeansPage
