# SQL Migration for Advanced Task Features

Please run the following SQL commands in your Supabase SQL Editor to enable the new features (Subtasks, Resizable Grid):

```sql
-- Add subtasks support (JSON array of subtask objects)
ALTER TABLE tasks 
ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;

-- Add grid layout support (Column spanning and Row spanning)
ALTER TABLE tasks 
ADD COLUMN col_span INTEGER DEFAULT 1;

ALTER TABLE tasks 
ADD COLUMN row_span INTEGER DEFAULT 1;

-- (Optional) If you want strict constraints on span sizes
ALTER TABLE tasks 
ADD CONSTRAINT check_col_span CHECK (col_span >= 1 AND col_span <= 4);

ALTER TABLE tasks 
ADD CONSTRAINT check_row_span CHECK (row_span >= 1 AND row_span <= 4);
```

These changes are required for the new "Resizable Box" and "Subtasks" features to work properly.
