#!/bin/sh
set -e

DB_FILE="/app/db/expensewise.db"

# Check if the database file exists. If not, create an empty file.
# This ensures that the application has a file to connect to on first run with a new volume.
if [ ! -f "$DB_FILE" ]; then
  echo "Database file not found. Creating empty file."
  mkdir -p /app/db
  touch "$DB_FILE"
fi

# Hand off to the CMD defined in the Dockerfile (or docker-compose)
exec "$@"
