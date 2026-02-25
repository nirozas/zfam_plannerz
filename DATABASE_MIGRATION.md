# Database Migration Guide

## Overview
The `supabase_migration.sql` script consolidates all your previous database iterations into one comprehensive migration that aligns with the current Zoabi Planner Pro application.

## What This Migration Does

### 1. Schema Alignment
- **Merges** your existing structure with app requirements
- **Preserves** all your data (profiles, planners, pages, layers)
- **Adds** missing columns like `type`, `structure`, `cover_url`
- **Migrates** data from `layers` table to `pages.elements`

### 2. Key Improvements
- ✅ Unified `pages` table with `elements` as JSONB (matches app code)
- ✅ Archive support (`is_archived`, `archived_at`)
- ✅ Last opened tracking (`last_opened_at`)
- ✅ Comprehensive `assets` table for templates and stickers
- ✅ Recursive Cards module (Folders, Lists, Entries)
- ✅ Production-ready RLS policies
- ✅ Auto-updating timestamps
- ✅ CASCADE deletes for data integrity

### 3. Data Migration
The script automatically:
- Renames `pages.index` → `pages.page_number` (if needed)
- Merges `layers.ink_paths` + `layers.elements` → `pages.elements`
- Preserves all existing planners and user data

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com/project/ufwtohehgttrlxdjmufj/editor
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase_migration.sql`
5. Click **Run** (or press Ctrl+Enter)

### Option 2: Test First (Safer)
1. **Create a backup** of your database first
2. Or use Supabase's **branching feature** to test on a copy
3. Run the migration on the test database
4. Verify everything works
5. Then run on production

## After Migration

### Verify the Changes
Run these queries to confirm:

```sql
-- Check planners table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'planners';

-- Check if data was preserved
SELECT COUNT(*) as total_planners FROM planners;
SELECT COUNT(*) as total_pages FROM pages;

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('planners', 'pages', 'assets');
```

### Optional: Seed Sample Assets
If you want sample stickers and templates, uncomment **PART 6** in the migration script (around line 270).

### Cleanup Old Tables
After verifying everything works, you can remove the old `layers` table:

```sql
DROP TABLE IF EXISTS public.layers CASCADE;
```

## What Changed From Your Previous Schema

| Feature | Before | After |
|---------|--------|-------|
| Page storage | `layers` table with separate `ink_paths` | `pages.elements` JSONB with `lines` array |
| Page indexing | `pages.index` | `pages.page_number` |
| Planner types | `category` only | Both `type` and `structure` |
| RLS policies | Multiple specific policies | Consolidated `_owner_all` policies |
| Auto-save | Manual triggers | Built-in with `handle_updated_at()` |

## Compatibility with Current App

The migration ensures these app features work:
- ✅ Canvas auto-save (stores to `pages.elements.lines`)
- ✅ Planner creation wizard (saves `type` and `structure`)
- ✅ Dashboard filtering (uses `is_archived`)
- ✅ Template library (reads from `assets` table)
- ✅ User authentication (RLS policies aligned)

## Troubleshooting

### If you see "relation already exists" errors:
The script uses `IF NOT EXISTS` and `IF EXISTS` checks - these are safe to ignore.

### If RLS blocks your queries:
Make sure you're authenticated when testing. The policies require `auth.uid()` to match `user_id`.

### If data looks missing:
Check the `layers` table - your data is still there. The migration copies it to `pages.elements`, it doesn't delete the original.

## Support

If you encounter issues:
1. Check the Supabase logs: Dashboard → Logs
2. Review RLS policies: Dashboard → Authentication → Policies
3. Verify your user ID: `SELECT auth.uid();`

## Next Steps

After successfully running the migration:
1. ✅ Test creating a new planner from the app
2. ✅ Test drawing on the canvas and verify it saves
3. ✅ Test navigating between pages
4. ✅ Test the template library
5. ✅ Update `src/lib/supabase.ts` if needed (should work as-is)
