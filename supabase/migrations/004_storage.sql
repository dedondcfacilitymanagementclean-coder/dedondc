-- 004: storage buckets and policies. Run after 003.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('customer-uploads', 'customer-uploads', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- public-media: anyone can view; only admin can add/change/remove
create policy "public-media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_admin());

-- customer-uploads (private): visitors may only ADD files under incoming/<uuid>/.
-- No select/update/delete for visitors, so they cannot read or overwrite anything.
create policy "customer-uploads visitor insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'customer-uploads' and name like 'incoming/%');
create policy "customer-uploads admin read" on storage.objects for select to authenticated
  using (bucket_id = 'customer-uploads' and public.is_admin());
create policy "customer-uploads admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'customer-uploads' and public.is_admin());
