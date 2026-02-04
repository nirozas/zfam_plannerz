# Zoabi Planner Pro - Database Setup

This file contains the Supabase database schema for the Zoabi Planner Pro application.

## Setup Instructions

1. Go to your Supabase dashboard: https://app.supabase.com/project/ufwtohehgttrlxdjmufj

2. Navigate to the SQL Editor

3. Copy the contents of `supabase_schema.sql` and execute it

## Tables Created

- **planners**: Stores planner metadata (name, type, cover, structure)
- **pages**: Stores individual pages within planners with their canvas elements
- **templates**: Public library of page templates
- **assets**: Public library of stickers and images

## Security

Row Level Security (RLS) is enabled to ensure users can only access their own planners and pages.
