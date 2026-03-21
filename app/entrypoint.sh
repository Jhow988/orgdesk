#!/bin/sh
set -e

echo "Running database migrations..."
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
./node_modules/.bin/prisma migrate deploy

echo "Starting application..."
exec node server.js
