# Fixing DATABASE_URL Password Issues

## Problem
The password in `DATABASE_URL` is not being recognized when connecting to Supabase.

## Common Causes

### 1. Special Characters Not URL-Encoded
PostgreSQL passwords often contain special characters (`@`, `#`, `$`, `%`, `&`, `*`, etc.) that need to be URL-encoded in connection strings.

### 2. Password Format Issues
- Spaces in password
- Quotes around password
- Incorrect password

## Solutions

### Solution 1: URL-Encode Special Characters

If your password contains special characters, you need to URL-encode them:

| Character | URL-Encoded |
|-----------|------------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `*` | `%2A` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| `\` | `%5C` |
| `:` | `%3A` |
| `;` | `%3B` |
| `,` | `%2C` |
| ` ` (space) | `%20` or `+` |

**Example:**
If your password is `MyP@ss#123`, the URL-encoded version is `MyP%40ss%23123`

```bash
# Before (won't work)
DATABASE_URL=postgresql://postgres:MyP@ss#123@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres

# After (correct)
DATABASE_URL=postgresql://postgres:MyP%40ss%23123@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres
```

### Solution 2: Use Online URL Encoder

1. Go to https://www.urlencoder.org/
2. Paste your password
3. Copy the encoded version
4. Use it in DATABASE_URL

### Solution 3: Get Fresh Password from Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Click **Reset database password** (if needed)
6. Copy the **URI** connection string (it will have the password already encoded)

### Solution 4: Use Connection Pooling Port (Alternative)

Supabase also provides a connection pooling port (6543) that might work better:

```bash
# Instead of port 5432, use 6543
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.yihuqlzbhaptqjcgcpmh.supabase.co:6543/postgres?pgbouncer=true
```

**Note:** Connection pooling requires `pgbouncer=true` parameter.

### Solution 5: Test Connection

Create a test script to verify the connection:

```bash
# Create test-connection.js
cat > test-connection.js << 'EOF'
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('Current time:', res.rows[0].now);
    pool.end();
  }
});
EOF

# Run it
node test-connection.js
```

## Quick Fix Script

Run this to URL-encode your password:

```bash
# Replace YOUR_PASSWORD with your actual password
PASSWORD="YOUR_PASSWORD"
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASSWORD', safe=''))")
echo "Encoded password: $ENCODED"
echo ""
echo "Add to .env:"
echo "DATABASE_URL=postgresql://postgres:$ENCODED@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres"
```

## Recommended Approach

**Best practice:** Get the connection string directly from Supabase Dashboard:

1. Go to Supabase Dashboard → Settings → Database
2. Find **Connection string** section
3. Select **URI** format
4. Copy the entire string (password is already encoded)
5. Paste into your `.env` file

This ensures:
- ✅ Password is correctly encoded
- ✅ All parameters are correct
- ✅ No manual encoding needed

## Verify Your Setup

After updating `.env`, verify:

1. **Check if password is encoded:**
   ```bash
   # Should NOT see special characters like @, #, $ in the password part
   grep DATABASE_URL .env
   ```

2. **Test connection:**
   ```bash
   # Using psql (if installed)
   psql "$DATABASE_URL" -c "SELECT 1;"
   
   # Or use the test script above
   ```

3. **Check app logs:**
   - Start your app
   - Look for connection errors
   - Should see "✅ Using SupabaseStorage (REST API)" if working

## Troubleshooting

### "password authentication failed"
- Password is incorrect or not encoded
- Try resetting password in Supabase Dashboard
- Use the connection string from Supabase (already encoded)

### "connection refused"
- Check if using correct port (5432 or 6543)
- Verify IP restrictions in Supabase Dashboard
- Try connection pooling port (6543)

### "self-signed certificate"
- Add `?sslmode=require` to connection string
- Or use SSL config in code (already handled in `server/db.ts`)

## Example .env Entry

```bash
# Get this directly from Supabase Dashboard → Settings → Database → Connection string (URI)
DATABASE_URL=postgresql://postgres.xxxxx:[YOUR-ENCODED-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Or direct connection (port 5432)
DATABASE_URL=postgresql://postgres:[YOUR-ENCODED-PASSWORD]@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres
```

**Remember:** The password part (between `:` and `@`) must be URL-encoded if it contains special characters!
