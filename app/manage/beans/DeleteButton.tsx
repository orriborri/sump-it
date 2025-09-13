'use client'

import React, { useState } from 'react'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material'
import { Delete } from '@mui/icons-material'
import { deleteBean } from './actions'

interface DeleteButtonProps {
  beanId: number
  beanName: string
}

export function DeleteButton({ beanId, beanName }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    await deleteBean(beanId)
    setOpen(false)
  }

  return (
    <>
      <IconButton 
        size="small" 
        onClick={() => setOpen(true)}
        sx={{ color: '#DC143C' }}
      >
        <Delete fontSize="small" />
      </IconButton>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle sx={{ color: '#8B4513' }}>
          Delete Coffee Bean
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{beanName}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="contained"
            sx={{ bgcolor: '#DC143C', '&:hover': { bgcolor: '#B91C3C' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
