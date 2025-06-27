import React from 'react'
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/app/lib/database'
import { GrindersModel } from '@/app/lib/generated-models/Grinders'
import { EditGrinderClient } from './EditGrinderClient'

// Force dynamic rendering since we need database access
export const dynamic = 'force-dynamic'

async function getGrinder(id: string) {
  try {
    const grindersModel = new GrindersModel(db)
    const grinder = await grindersModel.findById(parseInt(id))
    return grinder
  } catch (error) {
    console.error('Error fetching grinder:', error)
    return null
  }
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditGrinderPage({ params }: PageProps) {
  const { id } = await params
  const grinder = await getGrinder(id)

  if (!grinder) {
    notFound()
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/" underline="hover">
          Home
        </MuiLink>
        <MuiLink component={Link} href="/manage" underline="hover">
          Manage
        </MuiLink>
        <MuiLink component={Link} href="/manage/grinders" underline="hover">
          Grinders
        </MuiLink>
        <Typography color="text.primary">Edit {grinder.name}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" component="h1" gutterBottom>
        Edit Grinder
      </Typography>

      <EditGrinderClient
        grinder={{
          id: grinder.id,
          name: grinder.name || '',
          min_setting: grinder.min_setting || 1,
          max_setting: grinder.max_setting || 40,
          step_size: grinder.step_size || 1.0,
          setting_type: grinder.setting_type || 'numeric',
        }}
      />
    </Box>
  )
}
