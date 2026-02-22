# Converted SQL Files for PostgreSQL

These scripts convert `COPY ... FROM stdin` dumps into `INSERT` statements for easier manual execution against PostgreSQL.

## Files (Run in Order)

1. **01_schema_setup.sql** - Database extensions and setup
2. **02_core_tables.sql** - Users, sessions, threads, conversations
3. **03_messages_data.sql** - Messages table (large)
4. **04_quiz_and_learning.sql** - Quiz tables
5. **05_investment_and_approvals.sql** - Investment workflow tables
6. **06_documents_and_templates.sql** - Document and template tables
7. **07_response_cache.sql** - Response cache with vectors (very large)
8. **08_other_tables_and_constraints.sql** - Remaining tables + constraints (very large)

## Important Notes

### Boolean Values
The converted files may include `'t'` and `'f'`. If your tooling rejects them, replace with:
- Replace `'t'` with `true`
- Replace `'f'` with `false`

PostgreSQL accepts `'t'`/`'f'` for boolean columns.

### NULL Values
`\N` from the original COPY format has been converted to `NULL` in INSERT statements.

### File Sizes
- Files 01-06: Small to medium size (easy manual run)
- Files 07-08: Large files (3-4 MB each)
  - Prefer `psql` for these:
    ```bash
    psql "$DATABASE_URL" < pg_dump_split_converted/07_response_cache.sql
    psql "$DATABASE_URL" < pg_dump_split_converted/08_other_tables_and_constraints.sql
    ```

## Usage

1. Ensure `DATABASE_URL` points to your local PostgreSQL instance
2. Run files 01-08 in order
3. Wait for each file to complete before running the next

## Differences from Original Files

- ✅ `COPY ... FROM stdin` → `INSERT INTO ... VALUES`
- ✅ `\N` → `NULL`
- ✅ `\.` (end marker) → Removed (not needed in INSERT)
- ✅ Proper string escaping for single quotes
