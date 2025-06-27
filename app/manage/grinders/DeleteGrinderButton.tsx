'use client'
import React, { useState } from 'react'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material'
import { Delete } from '@mui/icons-material'
import { deleteGrinder } from './actions'

interface DeleteGrinderButtonProps {
  grinderId: number
  grinderName: string
}

export const DeleteGrinderButton: React.FC<DeleteGrinderButtonProps> = ({
  grinderId,
  grinderName,
}) => {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGrinder(grinderId)
      // Redirect is handled by the server action
    } catch (error) {
      console.error('Error deleting grinder:', error)
      setIsDeleting(false)
    }
  }

  return (
    <>
      <IconButton
        color="error"
        size="small"
        onClick={() => setOpen(true)}
        disabled={isDeleting}
      >
        <Delete />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Grinder</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{grinderName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently remove the grinder and all its settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Grinder'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
