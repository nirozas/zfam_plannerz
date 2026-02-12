# PDF Import Error - RESOLVED

## The Real Problem
The error message revealed the actual issue:
```
"Could not find the 'section' column of 'pages' in the schema cache"
```

Your `pages` table is missing **FOUR** columns, not just three:
1. ❌ `section` - Page category (General, Daily, Weekly, etc.)
2. ❌ `links` - Clickable PDF hotspots
3. ❌ `dimensions` - Page width/height
4. ❌ `layout` - Page orientation

## IMMEDIATE FIX - Run This Now

### Step 1: Open Supabase SQL Editor
Go to: `https://ufwtohehgttrlxdjmufj.supabase.co/project/_/sql`

### Step 2: Run This Complete Migration
Copy and paste the entire contents of `supabase_complete_schema_fix.sql`:

```sql
-- Add ALL missing columns to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS layout TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pages.section IS 'Page section/category: General, Daily, Weekly, Monthly, Notes, etc.';
COMMENT ON COLUMN pages.links IS 'Array of clickable hotspot links extracted from PDF or manually added';
COMMENT ON COLUMN pages.dimensions IS 'Page dimensions as {width: number, height: number}';
COMMENT ON COLUMN pages.layout IS 'Page layout type: portrait, landscape, square, double-width, widescreen, or custom';

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_pages_section ON pages(section);
CREATE INDEX IF NOT EXISTS idx_pages_layout ON pages(layout);
```

### Step 3: Verify Success
After running the migration, run this verification query:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pages'
  AND column_name IN ('section', 'links', 'dimensions', 'layout')
ORDER BY column_name;
```

**Expected Result:** 4 rows showing all columns exist

### Step 4: Uncomment Code in plannerStore.ts
After the migration succeeds, find line ~2394 in `plannerStore.ts` and change:

**FROM:**
```typescript
section: defaultSection || 'General'
// NOTE: links, dimensions, and layout are commented out until schema is updated
// Uncomment these after running supabase_schema_update.sql:
// links: pdfPages[index].links || [],
// dimensions: { width: ..., height: ... },
// layout: ...
```

**TO:**
```typescript
section: defaultSection || 'General',
links: pdfPages[index].links || [],
dimensions: { 
    width: selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.width : pdfPages[index].width, 
    height: selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.height : pdfPages[index].height 
},
layout: selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.layout : (pdfPages[index].width > pdfPages[index].height ? 'landscape' : 'portrait')
```

### Step 5: Test PDF Import
Try importing a PDF again. It should work perfectly now!

## Why This Happened
Your database schema is out of sync with the application code. This typically happens when:
- The database was created with an older version of the schema
- Migrations weren't run after code updates
- The schema was manually modified

## What Will Work After This Fix
✅ PDF import with any file
✅ Page sections (General, Daily, Weekly, etc.)
✅ Clickable PDF hyperlinks
✅ Custom page sizes (A4, Postcard, etc.)
✅ Proper page layout tracking

## Files Created
1. `supabase_complete_schema_fix.sql` - **RUN THIS FIRST**
2. `inspect_pages_table.sql` - Optional: See all current columns
3. `verify_schema.sql` - Optional: Verify specific columns

## Troubleshooting
If you still get errors after running the migration:
1. Check if the migration actually ran (no errors in SQL editor)
2. Try refreshing your browser (clear Supabase cache)
3. Run the inspect query to see what columns actually exist
4. Share the output with me for further debugging
