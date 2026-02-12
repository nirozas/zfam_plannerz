-- SUPABASE STORAGE SETUP SCRIPT
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('planner-uploads', 'planner-uploads', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for Buckets
-- Note: Replace 'authenticated' with 'anon' if you allow guest uploads, but 'authenticated' is safer.

-- Stickers Bucket Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'stickers');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stickers' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'stickers' AND auth.role() = 'authenticated');

-- Templates Bucket Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'templates');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'templates' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'templates' AND auth.role() = 'authenticated');

-- Covers Bucket Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.role() = 'authenticated');

-- User Uploads Bucket Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'planner-uploads');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'planner-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'planner-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'planner-uploads' AND auth.role() = 'authenticated');

-- Voice Notes Bucket Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'voice-notes');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');

-- 3. Ensure profiles and assets tables exist (minimal check)
-- This script assumes your base tables are already set up via the initial migration.
