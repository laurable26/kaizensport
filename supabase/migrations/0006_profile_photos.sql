-- Ajouter avatar_url à la table profiles
alter table profiles
  add column if not exists avatar_url text;

-- Bucket profile-photos (privé)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS Storage : chaque utilisateur ne peut accéder qu'à son dossier
create policy "profile_photos_select" on storage.objects
  for select using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_photos_update" on storage.objects
  for update using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
