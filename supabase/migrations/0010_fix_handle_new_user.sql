-- =====================================================================
-- Migration 0010 : Corrige le trigger handle_new_user
-- Inclut app_mode dans l'insertion du profil
-- (nécessaire après l'ajout de la colonne app_mode en migration 0008)
-- À exécuter dans le Supabase SQL Editor
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, app_mode)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'musculation'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
