-- Migration to add slug column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing trips (using ID as fallback if title is empty)
UPDATE trips SET slug = COALESCE(
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')),
    id::text
) WHERE slug IS NULL;

-- Make slug NOT NULL and UNIQUE
ALTER TABLE trips ALTER COLUMN slug SET NOT NULL;
ALTER TABLE trips ADD CONSTRAINT trips_slug_unique UNIQUE (slug);
