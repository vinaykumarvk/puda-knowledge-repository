# Fix Report Generator Data Access Issue

## Problem
Report generator app is not fetching data after EKGproduct migration to Supabase.

## Root Cause
The migration might have enabled **Row Level Security (RLS)** on tables, or RLS policies might be blocking access if the report generator uses the **ANON key** instead of **SERVICE_ROLE key**.

## Solution

### Option 1: Disable RLS (Quick Fix - if you don't need RLS)

Run this SQL in Supabase SQL Editor:

```sql
-- Disable RLS on key tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE solution_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### Option 2: Create Permissive Policies (Keep RLS enabled)

If you want to keep RLS enabled but allow access:

```sql
-- Create permissive policies for all operations
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON investment_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON solution_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON template_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON messages FOR ALL USING (true) WITH CHECK (true);
```

### Option 3: Switch Report Generator to Service Role Key

If the report generator is using ANON key, switch it to SERVICE_ROLE key:

1. In report generator's `.env` file, change:
   ```
   SUPABASE_ANON_KEY=...  # Remove or comment out
   ```
   to:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. Update the Supabase client initialization to use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY`

## How to Check RLS Status

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to: **Authentication → Policies**
4. Check each table to see if RLS is enabled

## Verify Fix

After applying the fix, test the report generator:
1. Restart the report generator app
2. Try to fetch data (e.g., investment requests, documents)
3. Check browser console for any errors
4. Verify data appears in the app

## Notes

- **SERVICE_ROLE key** bypasses RLS (used by EKGproduct app)
- **ANON key** respects RLS policies (might be used by report generator)
- If both apps use SERVICE_ROLE key, RLS won't affect them
- If you need RLS for security, use Option 2 (permissive policies)
