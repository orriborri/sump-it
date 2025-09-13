#!/bin/sh
echo "Running database migrations..."
node --loader ts-node/esm ./migrate.ts
echo "Starting application..."
node server.js
