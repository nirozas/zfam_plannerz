-- Migration to add participants column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}';

-- Fix any NULLs just in case
UPDATE trips SET participants = '{}' WHERE participants IS NULL;
