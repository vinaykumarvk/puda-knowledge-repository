# Converted SQL Files for Supabase

These files have been converted from `COPY ... FROM stdin` format to standard `INSERT` statements, making them compatible with Supabase SQL Editor.

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
The converted files use `'t'` and `'f'` for boolean values. If you encounter errors, you may need to:
- Replace `'t'` with `true`
- Replace `'f'` with `false`

However, PostgreSQL should accept `'t'`/`'f'` if the column type is boolean, so this should work as-is.

### NULL Values
`\N` from the original COPY format has been converted to `NULL` in INSERT statements.

### File Sizes
- Files 01-06: Small to medium size (should work in SQL Editor)
- Files 07-08: Large files (3-4 MB each)
  - If too large for SQL Editor, use psql command line:
    ```bash
    psql "$DATABASE_URL" < pg_dump_split_converted/07_response_cache.sql
    psql "$DATABASE_URL" < pg_dump_split_converted/08_other_tables_and_constraints.sql
    ```

## Usage

1. Go to Supabase Dashboard → SQL Editor
2. Run files 01-08 in order
3. Wait for each file to complete before running the next

## Differences from Original Files

- ✅ `COPY ... FROM stdin` → `INSERT INTO ... VALUES`
- ✅ `\N` → `NULL`
- ✅ `\.` (end marker) → Removed (not needed in INSERT)
- ✅ Proper string escaping for single quotes
