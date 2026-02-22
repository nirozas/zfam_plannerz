-- Migration to add hero_config to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hero_config JSONB DEFAULT '{}'::jsonb;

-- Comment for the admin/user
-- Run this in your Supabase SQL Editor to enable persistent hero images across pages.
