# 0003: Publish separate frontend and backend images

- Status: Proposed
- Date: 2026-11-18
- Related: [Homelab deployment request](../instruction-log.md#2026-11-18--homelab-deployment)

## Context

The public registry has an image from the old monolithic application, not the current Next.js frontend and Rust API. The homelab needs reproducible images of the current code.

## Options considered

Keep using the old monolith, create a combined image with a process supervisor, or publish one image for each existing process. The first keeps outdated code running; the second adds process management and couples health checks.

## Decision

Build separate OCI images in CI, tag both by the source commit, and publish them to the existing Sump-it registry package from main. Configure the browser to call the API on the same origin at `/api`; the deployment routes that prefix to the backend.

## Consequences

Deployments must select matching frontend and backend revisions and provide PostgreSQL. No registry credentials should be needed to pull from the existing public package. The same-origin route avoids making the backend a separate public hostname.

## Verification

The PR workflow builds both images. After publishing, verify both tags resolve in the registry and smoke-test the UI and API through the deployment.
