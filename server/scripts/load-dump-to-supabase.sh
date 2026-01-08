#!/bin/bash
# Script to load pg_dump.sql into Supabase using psql
# This requires direct PostgreSQL connection to work

set -e

echo "🚀 Loading pg_dump.sql into Supabase..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "   Please set DATABASE_URL in your .env file"
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found"
  echo "   Install PostgreSQL client tools to use this script"
  echo "   Or use Supabase Dashboard SQL Editor instead"
  exit 1
fi

echo "📊 Connecting to Supabase..."
echo "   Host: $(echo $DATABASE_URL | sed -E 's/.*@([^:]+):.*/\1/')"

# Execute the SQL dump
echo "⏳ Loading SQL dump (this may take a while)..."
psql "$DATABASE_URL" < pg_dump.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
else
  echo "❌ Migration failed"
  echo "   If direct connection doesn't work, use Supabase Dashboard SQL Editor"
  exit 1
fi
