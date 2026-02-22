# Use Converted SQL Files for Manual Imports

The files in `pg_dump_split/` use `COPY ... FROM stdin`, which works with `psql` but is inconvenient in tools that only accept plain SQL statements.

If you want simple paste-and-run SQL scripts, use the converted files in `pg_dump_split_converted/`.

## File Selection

1. Prefer `pg_dump_split_converted/*.sql` for manual execution.
2. Use `pg_dump_split/*.sql` only when loading through `psql`.

## How to Tell the Difference

`COPY` format:
```sql
COPY public.users (...) FROM stdin;
m1-001	M1	$2b$10$...	Manager One	...
\.
```

`INSERT` format:
```sql
INSERT INTO public.users (...) VALUES
('m1-001', 'M1', '$2b$10$...', 'Manager One', ...),
('m2-001', 'M2', '$2b$10$...', 'Manager Two', ...);
```

## Recommended Execution Order

1. 01_schema_setup.sql
2. 02_core_tables.sql
3. 03_messages_data.sql
4. 04_quiz_and_learning.sql
5. 05_investment_and_approvals.sql
6. 06_documents_and_templates.sql
7. 07_response_cache.sql (may need psql if too large)
8. 08_other_tables_and_constraints.sql (may need psql if too large)
