// Grinder management route. Thin wrapper around the client-driven
// `GrinderManager` so the page itself holds no logic to test.
'use client';

import { Box, Container } from '@mui/material';

import { GrinderManager } from './GrinderManager';

export default function GrindersPage() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <GrinderManager />
      </Box>
    </Container>
  );
}
