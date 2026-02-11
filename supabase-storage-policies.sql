-- ============================================================
-- Storage RLS Policies for 'avatars' bucket
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Allow anyone to VIEW avatar images (public read)
create policy "Public avatar read access"
on storage.objects for select
using (bucket_id = 'avatars');

-- Allow authenticated users to UPLOAD their own avatar
-- Files must be in a folder matching their user ID (e.g., {user_id}/avatar.png)
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE (overwrite) their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
