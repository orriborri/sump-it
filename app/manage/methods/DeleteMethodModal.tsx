'use client'

import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'

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
        {/* Delete confirmation will be implemented */}
        <p>Are you sure you want to delete "{method.name}"?</p>
      </DialogContent>
    </Dialog>
  )
}
