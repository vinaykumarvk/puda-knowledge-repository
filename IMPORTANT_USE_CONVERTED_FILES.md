# ⚠️ IMPORTANT: Use Converted Files

## The Problem

The files in `pg_dump_split/` use `COPY ... FROM stdin` format which **does NOT work** in Supabase SQL Editor.

## The Solution

**Use files from `pg_dump_split_converted/` directory instead!**

## File Locations

❌ **DON'T USE:** `pg_dump_split/02_core_tables.sql` (has COPY format)
✅ **USE:** `pg_dump_split_converted/02_core_tables.sql` (has INSERT format)

## How to Tell the Difference

**Wrong file (COPY format):**
```sql
COPY public.users (...) FROM stdin;
m1-001	M1	$2b$10$...	Manager One	...
\.
```

**Correct file (INSERT format):**
```sql
INSERT INTO public.users (...) VALUES
('m1-001', 'M1', '$2b$10$...', 'Manager One', ...),
('m2-001', 'M2', '$2b$10$...', 'Manager Two', ...);
```

## Quick Checklist

- [ ] Using files from `pg_dump_split_converted/` directory
- [ ] Files contain `INSERT INTO` statements
- [ ] Boolean values are `true`/`false` (not `'t'`/`'f'`)
- [ ] NULL values are `NULL` (not `\N`)

## All Converted Files

Run these in order from `pg_dump_split_converted/`:
1. 01_schema_setup.sql
2. 02_core_tables.sql
3. 03_messages_data.sql
4. 04_quiz_and_learning.sql
5. 05_investment_and_approvals.sql
6. 06_documents_and_templates.sql
7. 07_response_cache.sql (may need psql if too large)
8. 08_other_tables_and_constraints.sql (may need psql if too large)
