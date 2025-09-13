#!/bin/sh
echo "Running database migrations..."
node migrate.js
echo "Starting application..."
node server.js
