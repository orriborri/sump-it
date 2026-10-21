// Route entry for the brew-logging workflow (ticket #145).
//
// The page is a thin wrapper: it mounts `BrewWorkflow` with its default (real)
// typed client. All behaviour and state live in `BrewWorkflow`, which is
// injected with a fake client in tests.
'use client';

import React from 'react';

import { BrewWorkflow } from './BrewWorkflow';

/**
 * Route entry for the brew-logging workflow. Mounts `BrewWorkflow` with its
 * default typed client.
 *
 * @returns The brew page.
 */
export default function BrewPage() {
  return <BrewWorkflow />;
}
