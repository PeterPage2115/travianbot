#!/bin/sh
set -e

# Ensure DATABASE_URL is always set for Prisma
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://travianbot:changeme@db:5432/travianbot_prod"
  echo "WARNING: DATABASE_URL not set, using default"
fi

echo "Running database migrations..."
npx prisma db push --accept-data-loss --url "$DATABASE_URL"

echo "Starting application..."
exec node dist/index.js