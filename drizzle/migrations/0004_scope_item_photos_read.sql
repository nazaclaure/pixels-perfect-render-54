DROP POLICY IF EXISTS "Item photos public read" ON storage.objects;

CREATE POLICY "Item photos scoped read" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'item-photos' AND (
    owner_id = (select auth.uid()::text)
    OR (storage.foldername(name))[1] = (select auth.uid()::text)
    OR public.has_role(auth.uid(), 'encargado')
    OR EXISTS (SELECT 1 FROM public.found_items f WHERE f.photo_path = storage.objects.name AND f.status <> 'por_recibir')
  )
);