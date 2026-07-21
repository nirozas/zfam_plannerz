-- Query to see ALL current columns in the pages table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'pages'
ORDER BY ordinal_position;

-- This will show you exactly what columns exist and what's missing
