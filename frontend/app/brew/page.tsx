// Route entry for the brew-logging workflow (ticket #145).
//
// The page is a thin wrapper: it mounts `BrewWorkflow` with its default (real)
// typed client. All behaviour and state live in `BrewWorkflow`, which is
// injected with a fake client in tests.
'use client';

import React from 'react';

import { BrewWorkflow } from './BrewWorkflow';

/**
 * Route entry for `/brew`: a thin wrapper that mounts {@link BrewWorkflow} with
 * its default (real) typed client. All behaviour and state live in the
 * workflow, which is injected with a fake client in tests.
 */
export default function BrewPage() {
  return <BrewWorkflow />;
}
