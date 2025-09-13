'use client'

import React, { useState } from 'react'
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
import { Coffee, Edit, Add } from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DeleteButton } from './DeleteButton'
import { AddBeanModal } from './AddBeanModal'

interface Bean {
  id: number
  name: string | null
  roster?: string | null
  rostery?: string | null
  roast_level?: string | null
}

interface BeansPageClientProps {
  beans: Bean[]
}

export function BeansPageClient({ beans }: BeansPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const handleModalClose = () => {
    setModalOpen(false)
    router.refresh()
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600 }}>
          ☕ Your Coffee Beans
        </Typography>
        <Button
          onClick={() => setModalOpen(true)}
          variant="contained"
          startIcon={<Add />}
          sx={{ 
            bgcolor: '#8B4513', 
            '&:hover': { bgcolor: '#6B3410' }
          }}
        >
          Add Bean
        </Button>
      </Box>

      {beans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 1 }}>
            No coffee beans yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first coffee bean to start tracking your collection
          </Typography>
          <Button
            onClick={() => setModalOpen(true)}
            variant="contained"
            startIcon={<Add />}
            sx={{ 
              bgcolor: '#8B4513', 
              '&:hover': { bgcolor: '#6B3410' }
            }}
          >
            Add Bean
          </Button>
        </Box>
      ) : (
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
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Roastery</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Roster</TableCell>
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
                        {bean.name || 'Unnamed Bean'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {bean.rostery || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {bean.roster || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={bean.roast_level || 'Unknown'} 
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
                      <DeleteButton beanId={bean.id} beanName={bean.name || 'Unknown'} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddBeanModal 
        open={modalOpen} 
        onClose={handleModalClose} 
      />
    </Box>
  )
}
