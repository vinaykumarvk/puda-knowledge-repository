#!/bin/bash

# Script to load file 7 (response_cache.sql) into Supabase
# This file is too large for the SQL Editor, so we use psql

set -e

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    echo "Please set it in your .env file or export it:"
    echo "export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres'"
    exit 1
fi

FILE="pg_dump_split_converted/07_response_cache.sql"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    exit 1
fi

echo "📁 Loading file: $FILE"
echo "📊 File size: $(ls -lh "$FILE" | awk '{print $5}')"
echo ""

# Load the file with SSL mode
# Supabase requires SSL connections
export PGSSLMODE=require

echo "⏳ Loading data (this may take a few minutes)..."
psql "$DATABASE_URL" -f "$FILE"

echo ""
echo "✅ File loaded successfully!"
