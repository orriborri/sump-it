// Route entry for the coffee bean inventory management page.
'use client';

import React from 'react';
import { Container } from '@mui/material';

import { BeanManager } from './BeanManager';

/**
 * Route entry for `/beans`: the coffee bean inventory management page. Renders
 * {@link BeanManager} inside the standard page container.
 */
export default function BeansPage() {
  return (
    <Container maxWidth="md">
      <BeanManager />
    </Container>
  );
}
