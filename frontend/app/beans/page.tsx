// Route entry for the coffee bean inventory management page.
'use client';

import React from 'react';
import { Container } from '@mui/material';

import { BeanManager } from './BeanManager';

/**
 * Route entry for the coffee bean inventory page. Wraps `BeanManager` in a
 * centered container.
 *
 * @returns The beans page.
 */
export default function BeansPage() {
  return (
    <Container maxWidth="md">
      <BeanManager />
    </Container>
  );
}
