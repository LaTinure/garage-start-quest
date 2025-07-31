-- Migration pour corriger l'incohérence de nommage des colonnes super_admins
-- Problème : Le schéma utilise 'is_active' mais le code fait référence à 'est_actif'
-- Solution : Standardiser sur 'est_actif' et assurer la compatibilité

-- 1. Vérifier et corriger la structure de la table super_admins
DO $$ 
BEGIN
    -- Vérifier si la table existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'super_admins') THEN
        CREATE TABLE public.super_admins (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL UNIQUE,
            nom TEXT,
            prenom TEXT,
            phone TEXT,
            est_actif BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Vérifier si la colonne is_active existe et la renommer en est_actif
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'is_active') THEN
            ALTER TABLE public.super_admins RENAME COLUMN is_active TO est_actif;
        END IF;

        -- Ajouter est_actif si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'est_actif') THEN
            ALTER TABLE public.super_admins ADD COLUMN est_actif BOOLEAN DEFAULT true;
        END IF;

        -- Renommer full_name vers nom et prenom si nécessaire
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'full_name') THEN
            -- Ajouter les colonnes nom et prenom si elles n'existent pas
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'nom') THEN
                ALTER TABLE public.super_admins ADD COLUMN nom TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'prenom') THEN
                ALTER TABLE public.super_admins ADD COLUMN prenom TEXT;
            END IF;
            
            -- Migrer les données de full_name vers nom (on peut faire un split plus tard si nécessaire)
            UPDATE public.super_admins SET nom = full_name WHERE full_name IS NOT NULL AND nom IS NULL;
            
            -- Supprimer l'ancienne colonne
            ALTER TABLE public.super_admins DROP COLUMN full_name;
        END IF;

        -- Renommer title vers poste si nécessaire  
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'title') THEN
            ALTER TABLE public.super_admins RENAME COLUMN title TO poste;
        END IF;

        -- Ajouter user_id si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'super_admins' AND column_name = 'user_id') THEN
            ALTER TABLE public.super_admins ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Activer RLS sur la table
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "super_admins_initial_access" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_select_policy" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_insert_policy" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_update_policy" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_delete_policy" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_allow_initial_creation" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can manage super admin records" ON public.super_admins;

-- 4. Créer les nouvelles politiques avec la bonne syntaxe
CREATE POLICY "super_admins_allow_initial_creation" ON public.super_admins
    FOR INSERT WITH CHECK (
        NOT EXISTS (SELECT 1 FROM public.super_admins WHERE est_actif = true)
    );

CREATE POLICY "super_admins_select_policy" ON public.super_admins
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.super_admins WHERE est_actif = true
        )
    );

CREATE POLICY "super_admins_insert_policy" ON public.super_admins
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.super_admins WHERE est_actif = true
        )
    );

CREATE POLICY "super_admins_update_policy" ON public.super_admins
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.super_admins WHERE est_actif = true
        )
    );

CREATE POLICY "super_admins_delete_policy" ON public.super_admins
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.super_admins WHERE est_actif = true
        )
    );

-- 5. Accorder les permissions appropriées
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admins TO authenticated;

-- 6. Créer ou remplacer la fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_super_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS update_super_admins_updated_at_trigger ON public.super_admins;
CREATE TRIGGER update_super_admins_updated_at_trigger
    BEFORE UPDATE ON public.super_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_super_admins_updated_at();

-- 8. Fonction pour vérifier si un utilisateur est super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.super_admins
        WHERE super_admins.user_id = $1 AND est_actif = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Fonction pour créer le premier super admin si aucun n'existe
CREATE OR REPLACE FUNCTION create_initial_super_admin(
    p_email TEXT,
    p_nom TEXT DEFAULT NULL,
    p_prenom TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    existing_user_id UUID;
    new_user_id UUID;
BEGIN
    -- Vérifier s'il existe déjà des super admins
    IF EXISTS (SELECT 1 FROM public.super_admins WHERE est_actif = true) THEN
        RAISE EXCEPTION 'Un Super-Admin existe déjà dans le système';
    END IF;

    -- Récupérer l'ID utilisateur par email s'il existe
    SELECT id INTO existing_user_id FROM auth.users WHERE email = p_email;
    
    IF existing_user_id IS NOT NULL THEN
        new_user_id := existing_user_id;
    ELSE
        RAISE EXCEPTION 'Aucun utilisateur trouvé avec cet email. Créez d''abord le compte utilisateur.';
    END IF;

    -- Insérer dans super_admins
    INSERT INTO public.super_admins (user_id, email, nom, prenom, phone)
    VALUES (new_user_id, p_email, p_nom, p_prenom, p_phone);

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON public.super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON public.super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_est_actif ON public.super_admins(est_actif);

-- 11. Commentaires pour documentation
COMMENT ON TABLE public.super_admins IS 'Table des Super-Administrateurs avec nommage cohérent en français';
COMMENT ON COLUMN public.super_admins.est_actif IS 'Statut actif du super-administrateur (nommage français cohérent)';

-- 12. Vérification finale et notification Supabase pour rafraîchir le cache
NOTIFY pgrst, 'reload schema';

-- 13. Log de la migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 021: Structure super_admins corrigée avec nommage cohérent (est_actif)';
END $$;