// Route entry for the coffee bean inventory management page.
'use client';

import React from 'react';
import { Container } from '@mui/material';

import { BeanManager } from './BeanManager';

export default function BeansPage() {
  return (
    <Container maxWidth="md">
      <BeanManager />
    </Container>
  );
}
