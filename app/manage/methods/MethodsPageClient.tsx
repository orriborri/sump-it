'use client'

import React, { useState } from 'react'
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
import { LocalCafe, Edit, Delete, Add } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { AddMethodModal } from './AddMethodModal'
import { EditMethodModal } from './EditMethodModal'
import { DeleteMethodModal } from './DeleteMethodModal'

interface Method {
  id: number
  name: string
}

interface MethodsPageClientProps {
  methods: Method[]
}

export function MethodsPageClient({ methods }: MethodsPageClientProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const router = useRouter()

  const handleAddModalClose = () => {
    setAddModalOpen(false)
    router.refresh()
  }

  const handleEditModalClose = () => {
    setEditModalOpen(false)
    setSelectedMethod(null)
    router.refresh()
  }

  const handleDeleteModalClose = () => {
    setDeleteModalOpen(false)
    setSelectedMethod(null)
    router.refresh()
  }

  const handleEdit = (method: Method) => {
    setSelectedMethod(method)
    setEditModalOpen(true)
  }

  const handleDelete = (method: Method) => {
    setSelectedMethod(method)
    setDeleteModalOpen(true)
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600 }}>
          ☕ Your Brew Methods
        </Typography>
        <Button
          onClick={() => setAddModalOpen(true)}
          variant="contained"
          startIcon={<Add />}
          sx={{ 
            bgcolor: '#8B4513', 
            '&:hover': { bgcolor: '#6B3410' }
          }}
        >
          Add Method
        </Button>
      </Box>

      {methods.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 1 }}>
            No brew methods yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first brewing method to start tracking your coffee setup
          </Typography>
          <Button
            onClick={() => setAddModalOpen(true)}
            variant="contained"
            startIcon={<Add />}
            sx={{ 
              bgcolor: '#8B4513', 
              '&:hover': { bgcolor: '#6B3410' }
            }}
          >
            Add Method
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
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Method Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {methods.map((method) => (
                <TableRow 
                  key={method.id}
                  sx={{ '&:hover': { bgcolor: 'rgba(139, 69, 19, 0.1)' } }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalCafe sx={{ color: '#8B4513' }} />
                      <Typography variant="subtitle1" sx={{ color: '#8B4513', fontWeight: 600 }}>
                        {method.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit(method)}
                        sx={{ color: '#8B4513' }}
                        aria-label="Edit method"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(method)}
                        sx={{ color: '#DC143C' }}
                        aria-label="Delete method"
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
      )}

      <AddMethodModal 
        open={addModalOpen} 
        onClose={handleAddModalClose} 
      />

      {selectedMethod && (
        <>
          <EditMethodModal 
            open={editModalOpen} 
            onClose={handleEditModalClose}
            method={selectedMethod}
          />
          <DeleteMethodModal 
            open={deleteModalOpen} 
            onClose={handleDeleteModalClose}
            method={selectedMethod}
          />
        </>
      )}
    </Box>
  )
}
