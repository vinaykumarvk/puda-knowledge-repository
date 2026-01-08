# Loading File 7 (response_cache.sql)

File 7 is 3.4 MB and too large for Supabase SQL Editor. Use `psql` from the command line.

## Prerequisites

1. **PostgreSQL client installed:**
   ```bash
   # macOS
   brew install postgresql
   
   # Or check if already installed:
   which psql
   ```

2. **Correct DATABASE_URL:**
   Make sure your `.env` file has the correct Supabase connection string:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres
   ```
   
   Get the password from: https://supabase.com/dashboard → Your Project → Settings → Database → Connection string

## Method 1: Using the Script (Recommended)

```bash
# Make sure DATABASE_URL is set
source .env  # or export DATABASE_URL=...

# Run the script
./server/scripts/load-file-7.sh
```

## Method 2: Direct psql Command

```bash
# Set SSL mode and load the file
export PGSSLMODE=require
psql "$DATABASE_URL" -f pg_dump_split_converted/07_response_cache.sql
```

## Method 3: Manual Connection

If the above doesn't work, connect manually:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres?sslmode=require" \
  -f pg_dump_split_converted/07_response_cache.sql
```

Replace `YOUR_PASSWORD` with your actual Supabase database password.

## Troubleshooting

### "password authentication failed"
- Check your password in Supabase dashboard
- Make sure the password in DATABASE_URL matches exactly
- Try resetting the database password in Supabase dashboard

### "psql: command not found"
- Install PostgreSQL client tools
- On macOS: `brew install postgresql`
- On Linux: `sudo apt-get install postgresql-client` (Ubuntu/Debian)

### "connection refused"
- Check if your IP is allowed in Supabase dashboard
- Supabase → Settings → Database → Connection pooling
- Or use the connection pooling port (6543) instead of 5432

## Expected Output

You should see:
```
CREATE TABLE
CREATE SEQUENCE
INSERT 0 1
INSERT 0 1
...
✅ File loaded successfully!
```

The process may take a few minutes for 3.4 MB of data.
