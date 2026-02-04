-- ==========================================
-- FIX STORAGE POLICIES FOR ASSET UPLOADS
-- ==========================================

-- 1. Ensure Public Read Access
DROP POLICY IF EXISTS "public_stickers_read" ON storage.objects;
CREATE POLICY "public_stickers_read" ON storage.objects FOR SELECT USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "public_templates_read" ON storage.objects;
CREATE POLICY "public_templates_read" ON storage.objects FOR SELECT USING (bucket_id = 'templates');

DROP POLICY IF EXISTS "public_covers_read" ON storage.objects;
CREATE POLICY "public_covers_read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');

-- 2. Add Upload (INSERT) Policies
-- These allow users to upload files to a folder named after their UID
DROP POLICY IF EXISTS "stickers_upload" ON storage.objects;
CREATE POLICY "stickers_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "templates_upload" ON storage.objects;
CREATE POLICY "templates_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "covers_upload" ON storage.objects;
CREATE POLICY "covers_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Add Update Policies
DROP POLICY IF EXISTS "stickers_update" ON storage.objects;
CREATE POLICY "stickers_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "templates_update" ON storage.objects;
CREATE POLICY "templates_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "covers_update" ON storage.objects;
CREATE POLICY "covers_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==========================================
-- POLICIES UPDATED SUCCESSFULLY
-- ==========================================
