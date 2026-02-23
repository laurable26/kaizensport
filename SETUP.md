# Top - Guide de démarrage

## 1. Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Choisir un nom (ex: `top-fitness`), une région, un mot de passe
3. Attendre la création (~1 min)

## 2. Configurer la base de données

Dans Supabase Dashboard → **SQL Editor** → New query :
- Coller le contenu de `supabase/migrations/0001_initial_schema.sql`
- Cliquer **Run**

## 3. Créer le bucket Storage pour les photos

Dans Supabase Dashboard → **Storage** → New bucket :
- Nom : `exercise-photos`
- Public : **désactivé**
- Taille max : `5242880` (5 MB)
- Types MIME : `image/jpeg,image/png,image/webp`

Puis dans SQL Editor, exécuter :
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-photos',
  'exercise-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
```

## 4. Récupérer les clés API

Dans Supabase Dashboard → **Settings** → **API** :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY`

## 5. Configurer les variables d'environnement

Éditer `.env.local` :
```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
VITE_VAPID_PUBLIC_KEY=VOTRE_VAPID_PUBLIC_KEY  # étape 7
```

## 6. Générer les types TypeScript (optionnel mais recommandé)

```bash
# Installer la CLI Supabase
npm install -g supabase

# Login
supabase login

# Générer les types
npx supabase gen types typescript --project-id VOTRE_PROJECT_ID > src/types/database.ts
```

Puis dans `src/lib/supabase.ts`, décommenter les lignes avec `Database` type.

## 7. Configurer les notifications push (VAPID)

```bash
# Générer les clés VAPID
npx web-push generate-vapid-keys
```

Ajouter dans `.env.local` :
```env
VITE_VAPID_PUBLIC_KEY=<public key>
```

Dans Supabase Dashboard → **Edge Functions** → **Secrets**, ajouter :
- `VAPID_PUBLIC_KEY` = votre clé publique
- `VAPID_PRIVATE_KEY` = votre clé privée
- `VAPID_SUBJECT` = `mailto:votre@email.com`

## 8. Déployer l'Edge Function

```bash
# Installer la CLI Supabase localement
npm install supabase --save-dev

# Link au projet
npx supabase link --project-ref VOTRE_PROJECT_ID

# Déployer la fonction
npx supabase functions deploy send-push
```

## 9. Configurer pg_cron (notifications automatiques)

Dans Supabase Dashboard → **SQL Editor** :
```sql
-- Activer pg_cron (une seule fois)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Planifier l'envoi des notifications toutes les 15 minutes
select cron.schedule(
  'send-push-notifications',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://VOTRE_PROJECT_ID.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## 10. Lancer en développement

```bash
npm run dev
```

Ouvrir `http://localhost:5173` dans le navigateur.

Pour tester sur mobile : utiliser les DevTools (F12 → Toggle device toolbar) ou déployer sur Vercel.

## 11. Déployer sur Vercel

```bash
npm install -g vercel
vercel

# Ajouter les variables d'environnement dans le dashboard Vercel :
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY
```

## Structure du projet

```
src/
├── lib/          # Configuration Supabase, React Query
├── types/        # Types TypeScript (database.ts, app.ts)
├── store/        # État global Zustand (session, timer, workout)
├── hooks/        # Logique métier (exercises, sessions, etc.)
├── components/   # Composants réutilisables
└── pages/        # Pages de l'application
    ├── Auth/
    ├── Dashboard/
    ├── Exercises/
    ├── Sessions/
    ├── Workouts/
    ├── Schedule/
    ├── History/
    └── Profile/

supabase/
├── migrations/   # Schema SQL
└── functions/    # Edge Functions (notifications push)
```

## Activer l'auth par lien magique (Magic Link)

Dans Supabase Dashboard → **Authentication** → **Providers** :
- Email : activé
- Confirm email : optionnel (désactiver pour faciliter les tests)

Dans **Authentication** → **URL Configuration** :
- Site URL : `http://localhost:5173` (dev) ou votre domaine Vercel
- Redirect URLs : ajouter votre domaine

## Notes importantes

- La PWA peut être installée sur iOS via Safari : **Partager → Sur l'écran d'accueil**
- Sur Android : Chrome affiche automatiquement un prompt d'installation
- Les notifications push nécessitent HTTPS (Vercel le gère automatiquement)
- Les photos sont compressées côté client avant upload (max 1MB)
