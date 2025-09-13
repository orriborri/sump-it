#!/bin/sh
echo "Running database migrations..."
npm run migrate
echo "Starting application..."
node server.js
