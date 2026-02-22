-- Migration to add traveler_name column to trip_packing_items table
ALTER TABLE trip_packing_items ADD COLUMN IF NOT EXISTS traveler_name TEXT;

-- Index for traveler-specific queries
CREATE INDEX IF NOT EXISTS idx_trip_packing_traveler_name ON trip_packing_items(traveler_name);
