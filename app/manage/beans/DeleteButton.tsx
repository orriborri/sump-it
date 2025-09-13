'use client'

import React from 'react'
import { IconButton } from '@mui/material'
import { Delete } from '@mui/icons-material'
import { deleteBean } from './actions'

interface DeleteButtonProps {
  beanId: number
  beanName: string
}

export function DeleteButton({ beanId, beanName }: DeleteButtonProps) {
  const handleDelete = async () => {
    if (confirm(`Delete "${beanName}"?`)) {
      await deleteBean(beanId)
    }
  }

  return (
    <IconButton 
      size="small" 
      onClick={handleDelete}
      sx={{ color: '#DC143C' }}
    >
      <Delete fontSize="small" />
    </IconButton>
  )
}
