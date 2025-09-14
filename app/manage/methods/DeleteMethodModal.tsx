'use client'

import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography, Button } from '@mui/material'
import { Close, Delete } from '@mui/icons-material'
import { deleteMethod } from '../actions'

interface Method {
  id: number
  name: string
}

interface DeleteMethodModalProps {
  open: boolean
  onClose: () => void
  method: Method
}

export function DeleteMethodModal({ open, onClose, method }: DeleteMethodModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMethod(method.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete method:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#F5F5DC',
          border: '2px solid #8B4513',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        color: '#8B4513', 
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        Delete Brew Method
        <IconButton onClick={onClose} sx={{ color: '#8B4513' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete "{method.name}"? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#8B4513' }}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          variant="contained"
          startIcon={<Delete />}
          sx={{ 
            bgcolor: '#DC143C', 
            '&:hover': { bgcolor: '#B91C3C' }
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
