-- Fonction RPC pour supprimer le compte utilisateur et toutes ses données
-- Doit être appelée en tant qu'utilisateur authentifié
create or replace function delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Supprimer les fichiers Storage (photos de profil)
  -- Note: les objets storage sont supprimés via cascade ou manuellement
  delete from storage.objects
  where bucket_id in ('profile-photos', 'exercise-photos')
    and (storage.foldername(name))[1] = uid::text;

  -- Supprimer les données applicatives (les FK en cascade s'occupent du reste)
  delete from profiles where id = uid;

  -- Supprimer l'utilisateur dans auth (déclenche la cascade côté Supabase)
  delete from auth.users where id = uid;
end;
$$;

-- Accorder l'exécution aux utilisateurs authentifiés
grant execute on function delete_user_account() to authenticated;
