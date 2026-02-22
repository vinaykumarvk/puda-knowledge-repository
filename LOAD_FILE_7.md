# Loading File 7 (`response_cache.sql`)

File 7 can be loaded directly into local PostgreSQL with `psql`.

## Prerequisites

1. `psql` installed:
   ```bash
   which psql
   ```
2. `.env` contains a working local connection string:
   ```bash
   DATABASE_URL=postgresql://localhost:5432/ekg_product
   ```

## Method 1: Use the helper script (recommended)

```bash
source .env
./server/scripts/load-file-7.sh
```

## Method 2: Run `psql` directly

```bash
source .env
psql "$DATABASE_URL" -f pg_dump_split_converted/07_response_cache.sql
```

## Troubleshooting

### "psql: command not found"
- macOS: `brew install postgresql`
- Ubuntu/Debian: `sudo apt-get install postgresql-client`

### "connection refused"
- Ensure PostgreSQL is running locally.
- Verify host/port in `DATABASE_URL`.

### "password authentication failed"
- Verify your local PostgreSQL user/password and database permissions.

## Expected Output

You should see normal SQL execution output (`CREATE`, `INSERT`, etc.) and script completion.
