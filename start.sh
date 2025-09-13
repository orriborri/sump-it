#!/bin/sh
echo "Running database migrations..."
./node_modules/.bin/tsx ./migrate.ts
echo "Starting application..."
node server.js
