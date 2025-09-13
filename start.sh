#!/bin/sh
echo "Running database migrations..."
node migrate-simple.js
echo "Starting application..."
node server.js
