-- Robust Migration to fix expense categories to match UI
-- 1. First, map ALL possible old categories to new ones
UPDATE trip_expenses SET category = 'Dining' WHERE category = 'Food';
UPDATE trip_expenses SET category = 'Transportation' WHERE category = 'Transport';
UPDATE trip_expenses SET category = 'Attraction' WHERE category = 'Entry';
UPDATE trip_expenses SET category = 'Shopping' WHERE category = 'Gifts';

-- 2. Catch-all: Any row that doesn't match our new set, move to 'Other'
-- This ensures the check constraint won't fail
UPDATE trip_expenses 
SET category = 'Other' 
WHERE category NOT IN ('Dining', 'Accommodation', 'Attraction', 'Transportation', 'Activity', 'Shopping', 'Other');

-- 3. Now drop and recreate the constraint safely
ALTER TABLE trip_expenses DROP CONSTRAINT IF EXISTS trip_expenses_category_check;

ALTER TABLE trip_expenses ADD CONSTRAINT trip_expenses_category_check 
CHECK (category IN ('Dining', 'Accommodation', 'Attraction', 'Transportation', 'Activity', 'Shopping', 'Other'));
