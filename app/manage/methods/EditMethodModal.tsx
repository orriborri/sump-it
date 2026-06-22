'use client'

import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'

interface Method {
  id: number
  name: string
}

interface EditMethodModalProps {
  open: boolean
  onClose: () => void
  method: Method
}

/**
 * Modal dialog for editing an existing brew method.
 * Currently displays a placeholder for the edit form implementation.
 * @todo Implement the full edit form with fields for method name and parameters
 */
export function EditMethodModal({
  open,
  onClose,
  method,
}: EditMethodModalProps) {
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
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          color: '#8B4513',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        Edit Brew Method
        <IconButton onClick={onClose} sx={{ color: '#8B4513' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Edit form will be implemented */}
        <p>Edit form for {method.name}</p>
      </DialogContent>
    </Dialog>
  )
}
