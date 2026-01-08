# Split SQL Dump Files

The `pg_dump.sql` file has been split into 8 smaller files that can be run one by one in the Supabase SQL Editor.

## Files (Run in Order)

1. **01_schema_setup.sql** (0.9 KB)
   - Database extensions (vector)
   - SET statements and configuration
   - No tables yet

2. **02_core_tables.sql** (13 KB)
   - Core system tables: users, sessions, threads, conversations
   - Table definitions and data

3. **03_messages_data.sql** (867 KB) ⚠️ Large file
   - Messages table (CREATE TABLE + data)
   - This is a large table with conversation data

4. **04_quiz_and_learning.sql** (57 KB)
   - Quiz tables: quiz_questions, quiz_attempts, quiz_responses, user_mastery, ba_knowledge_questions
   - Table definitions and data

5. **05_investment_and_approvals.sql** (5.7 KB)
   - Investment workflow: investment_requests, approvals, tasks, notifications, investment_rationales
   - Table definitions and data

6. **06_documents_and_templates.sql** (8.8 KB)
   - Documents and templates: documents, document_categories, templates, solution_templates, template_sections, template_work_items, template_revisions
   - Table definitions and data

7. **07_response_cache.sql** (3.4 MB) ⚠️ Very large file
   - Response cache table with vector embeddings
   - This file contains large vector data
   - **If this is too large for SQL Editor, you may need to split it further or load it via psql**

8. **08_other_tables_and_constraints.sql** (4.3 MB) ⚠️ Very large file
   - Remaining tables: historical_rfps, excel_requirement_responses, reference_responses, rfp_responses, background_jobs, cross_document_queries, deep_mode_jobs, document_queries, sequences, web_search_queries
   - All foreign key constraints
   - **If this is too large, you may need to split it further**

## How to Use

### Option 1: Supabase Dashboard SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. For each file (01 through 08):
   - Click **New Query**
   - Copy the entire contents of the file
   - Paste into the SQL Editor
   - Click **Run**
   - **Wait for completion** before moving to the next file

### Option 2: Command Line (if direct connection works)

```bash
# Make sure DATABASE_URL is set in .env
for file in pg_dump_split/0*.sql; do
  echo "Running $file..."
  psql "$DATABASE_URL" < "$file"
done
```

## Important Notes

- ⚠️ **Files 07 and 08 are large (3-4 MB each)**
  - If Supabase SQL Editor has size limits, you may need to:
    - Use psql command line instead
    - Or split these files further (see below)

- **Run files in order** (01, 02, 03, 04, 05, 06, 07, 08)
- **Wait for each file to complete** before running the next
- **File 08 contains foreign key constraints** - must run last

## If Files 07 or 08 Are Too Large

If you encounter size limits in Supabase SQL Editor for files 07 or 08:

1. **Use psql command line:**
   ```bash
   psql "$DATABASE_URL" < pg_dump_split/07_response_cache.sql
   psql "$DATABASE_URL" < pg_dump_split/08_other_tables_and_constraints.sql
   ```

2. **Or split further:**
   ```bash
   # Split response_cache data into smaller chunks
   python3 server/scripts/split-large-tables.py
   ```

## Troubleshooting

### "Table already exists"
- Skip the CREATE TABLE statement, or
- Drop the table first: `DROP TABLE IF EXISTS table_name CASCADE;`

### "Foreign key constraint" error
- Make sure you're running files in order
- File 08 must run last (contains all constraints)

### "Extension vector does not exist"
- Make sure file 01 runs completely first

### File too large for SQL Editor
- Use psql command line for large files
- Or contact Supabase support about size limits
