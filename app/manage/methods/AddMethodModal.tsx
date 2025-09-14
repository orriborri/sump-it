'use client'

import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import { AddMethodForm } from './AddMethodForm'

interface AddMethodModalProps {
  open: boolean
  onClose: () => void
}

export function AddMethodModal({ open, onClose }: AddMethodModalProps) {
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
        Add New Brew Method
        <IconButton onClick={onClose} sx={{ color: '#8B4513' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <AddMethodForm onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  )
}
