"use client";
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { GrinderForm } from '../GrinderForm';
import { createGrinder, GrinderFormData } from '../actions';

export default function NewGrinderPage() {
  const router = useRouter();

  const handleSubmit = async (data: GrinderFormData) => {
    await createGrinder(data);
    // Redirect is handled by the server action
  };

  const handleCancel = () => {
    router.push('/manage/grinders');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Add New Grinder
      </Typography>
      
      <GrinderForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
      />
    </Box>
  );
}
