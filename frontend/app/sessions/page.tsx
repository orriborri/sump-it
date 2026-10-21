// Route entry for the brewing-session history page (ticket #146).
'use client';

import React from 'react';
import { Box, Container } from '@mui/material';

import { SessionHistory } from './SessionHistory';

/**
 * Route entry for the brewing-session history page. Wraps `SessionHistory` in a
 * centered container.
 *
 * @returns The sessions page.
 */
export default function SessionsPage() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <SessionHistory />
      </Box>
    </Container>
  );
}
