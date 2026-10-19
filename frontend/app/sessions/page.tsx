// Route entry for the brewing-session history page (ticket #146).
'use client';

import React from 'react';
import { Box, Container } from '@mui/material';

import { SessionHistory } from './SessionHistory';

export default function SessionsPage() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <SessionHistory />
      </Box>
    </Container>
  );
}
