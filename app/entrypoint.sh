#!/bin/sh
set -e

echo "Running database migrations..."

# If the tickets migration was previously recorded as failed (due to invalid SQL),
# mark it as rolled back so migrate deploy can re-apply the fixed version.
./node_modules/.bin/prisma migrate resolve --rolled-back 20260327100000_create_tickets 2>/dev/null || true

./node_modules/.bin/prisma migrate deploy

echo "Starting application..."
exec node server.js
