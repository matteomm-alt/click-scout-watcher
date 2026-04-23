-- Bucket pubblico per logo e asset di società
INSERT INTO storage.buckets (id, name, public)
VALUES ('society-assets', 'society-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Lettura pubblica
DROP POLICY IF EXISTS "society_assets_public_read" ON storage.objects;
CREATE POLICY "society_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'society-assets');

-- Upload: solo society_admin (o super_admin) della società corrispondente.
-- Convenzione path: <society_id>/<filename>
DROP POLICY IF EXISTS "society_assets_admin_insert" ON storage.objects;
CREATE POLICY "society_assets_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'society-assets'
  AND public.is_society_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "society_assets_admin_update" ON storage.objects;
CREATE POLICY "society_assets_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'society-assets'
  AND public.is_society_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "society_assets_admin_delete" ON storage.objects;
CREATE POLICY "society_assets_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'society-assets'
  AND public.is_society_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);