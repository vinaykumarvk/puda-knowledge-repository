# Split SQL Dump Files

The `pg_dump.sql` file is split into 8 smaller files that can be executed in order.

## Files (Run in Order)

1. `01_schema_setup.sql`
2. `02_core_tables.sql`
3. `03_messages_data.sql`
4. `04_quiz_and_learning.sql`
5. `05_investment_and_approvals.sql`
6. `06_documents_and_templates.sql`
7. `07_response_cache.sql` (large)
8. `08_other_tables_and_constraints.sql` (large)

## Recommended Usage (local PostgreSQL)

```bash
source .env
for file in pg_dump_split/0*.sql; do
  echo "Running $file..."
  psql "$DATABASE_URL" < "$file"
done
```

## Notes

- Run files in order.
- Files `07` and `08` are large; command-line `psql` is recommended.
- File `08` includes constraints and should run last.

## Troubleshooting

### "table already exists"
- Drop target tables first if needed.

### "foreign key constraint" errors
- Re-run from `01` in order and ensure earlier files completed.

### "extension vector does not exist"
- Ensure extension setup was applied (`CREATE EXTENSION IF NOT EXISTS vector;`).
