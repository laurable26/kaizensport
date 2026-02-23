-- ============================================================
-- KAIZEN SPORT - Amis & invitations de séance
-- Coller ce fichier dans Supabase > SQL Editor > Run
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

-- Profils publics (nécessaire pour chercher des amis par email)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  updated_at timestamptz default now()
);

-- Trigger pour créer automatiquement le profil à l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Amitiés (relation symétrique, toujours stockée avec user_id_1 < user_id_2)
create table if not exists friendships (
  id          uuid primary key default uuid_generate_v4(),
  user_id_1   uuid not null references auth.users(id) on delete cascade,
  user_id_2   uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requester   uuid not null references auth.users(id), -- qui a envoyé la demande
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id_1, user_id_2)
);

-- Invitations à une séance active
create table if not exists session_invites (
  id              uuid primary key default uuid_generate_v4(),
  session_log_id  uuid not null references session_logs(id) on delete cascade,
  inviter_id      uuid not null references auth.users(id) on delete cascade,
  invitee_id      uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now(),
  unique (session_log_id, invitee_id)
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table profiles         enable row level security;
alter table friendships      enable row level security;
alter table session_invites  enable row level security;

-- Profiles : visibles par tous (pour chercher par email), modifiables par soi
create policy "profiles_select" on profiles
  for select using (true);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

-- Friendships : visibles si on est l'un des deux utilisateurs
create policy "friendships_select" on friendships
  for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "friendships_insert" on friendships
  for insert with check (auth.uid() = requester);

create policy "friendships_update" on friendships
  for update using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "friendships_delete" on friendships
  for delete using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Session invites : visibles par l'inviteur ou l'invité
create policy "invites_select" on session_invites
  for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);

create policy "invites_insert" on session_invites
  for insert with check (auth.uid() = inviter_id);

create policy "invites_update" on session_invites
  for update using (auth.uid() = invitee_id);

-- set_logs : les amis acceptés peuvent voir les set_logs des sessions invitées
create policy "friends_set_logs" on set_logs
  for select using (
    exists (
      select 1 from session_invites si
      join session_logs sl on sl.id = si.session_log_id
      where sl.id = set_logs.session_log_id
        and si.invitee_id = auth.uid()
        and si.status = 'accepted'
    )
    or exists (
      select 1 from session_logs sl where sl.id = set_logs.session_log_id and sl.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_friendships_user1 on friendships (user_id_1);
create index if not exists idx_friendships_user2 on friendships (user_id_2);
create index if not exists idx_session_invites_invitee on session_invites (invitee_id, status);
create index if not exists idx_session_invites_log on session_invites (session_log_id);

-- ─────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────

-- Activer Realtime pour les invitations et set_logs (suivi temps réel)
alter publication supabase_realtime add table session_invites;
alter publication supabase_realtime add table set_logs;
