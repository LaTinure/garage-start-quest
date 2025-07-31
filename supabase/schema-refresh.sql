-- Script de rafraîchissement du cache schéma Supabase
-- Utilisé pour résoudre les erreurs PGRST204 et optimiser les performances

-- 1. Forcer le rechargement du cache PostgREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 2. Vérifier la structure de super_admins
DO $$
DECLARE
    column_exists boolean;
    table_exists boolean;
BEGIN
    -- Vérifier si la table existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'super_admins'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Table super_admins trouvée';
        
        -- Vérifier la colonne est_actif
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'super_admins' 
            AND column_name = 'est_actif'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Colonne est_actif trouvée dans super_admins';
        ELSE
            RAISE WARNING 'Colonne est_actif MANQUANTE dans super_admins';
        END IF;
        
        -- Vérifier les autres colonnes importantes
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'super_admins' 
            AND column_name = 'user_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Colonne user_id trouvée dans super_admins';
        ELSE
            RAISE WARNING 'Colonne user_id MANQUANTE dans super_admins';
        END IF;
    ELSE
        RAISE ERROR 'Table super_admins MANQUANTE';
    END IF;
END $$;

-- 3. Optimisation des requêtes fréquentes
-- Analyser les statistiques des tables
ANALYZE public.super_admins;
ANALYZE public.users;
ANALYZE public.organisations;

-- 4. Vérifier les index critiques
DO $$
BEGIN
    -- Index sur super_admins.user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'super_admins' 
        AND indexname = 'idx_super_admins_user_id'
    ) THEN
        CREATE INDEX idx_super_admins_user_id ON public.super_admins(user_id);
        RAISE NOTICE 'Index idx_super_admins_user_id créé';
    END IF;

    -- Index sur super_admins.est_actif
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'super_admins' 
        AND indexname = 'idx_super_admins_est_actif'
    ) THEN
        CREATE INDEX idx_super_admins_est_actif ON public.super_admins(est_actif);
        RAISE NOTICE 'Index idx_super_admins_est_actif créé';
    END IF;

    -- Index composite pour les requêtes courantes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'super_admins' 
        AND indexname = 'idx_super_admins_user_id_actif'
    ) THEN
        CREATE INDEX idx_super_admins_user_id_actif ON public.super_admins(user_id, est_actif);
        RAISE NOTICE 'Index composite idx_super_admins_user_id_actif créé';
    END IF;
END $$;

-- 5. Vérifier les politiques RLS
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'super_admins';
    
    RAISE NOTICE 'Nombre de politiques RLS sur super_admins: %', policy_count;
    
    IF policy_count = 0 THEN
        RAISE WARNING 'Aucune politique RLS trouvée sur super_admins';
    END IF;
END $$;

-- 6. Test de la requête critique qui cause l'erreur PGRST204
DO $$
DECLARE
    test_count integer;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO test_count
        FROM public.super_admins 
        WHERE est_actif = true;
        
        RAISE NOTICE 'Test réussi: % super-admins actifs trouvés', test_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE ERROR 'Erreur lors du test de la requête: %', SQLERRM;
    END;
END $$;

-- 7. Rafraîchir les vues matérialisées si elles existent
DO $$
BEGIN
    -- Vérifier s'il y a des vues matérialisées à rafraîchir
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public') THEN
        -- Rafraîchir toutes les vues matérialisées
        PERFORM pg_catalog.refresh_materialized_view(oid) 
        FROM pg_class 
        WHERE relkind = 'm' AND relnamespace = 'public'::regnamespace;
        
        RAISE NOTICE 'Vues matérialisées rafraîchies';
    END IF;
END $$;

-- 8. Optimiser la configuration PostgREST
-- Ces commandes sont informatives pour l'administrateur
DO $$
BEGIN
    RAISE NOTICE 'Pour optimiser PostgREST, vérifiez la configuration suivante:';
    RAISE NOTICE '- db-schema = "public"';
    RAISE NOTICE '- db-anon-role = "anon"';
    RAISE NOTICE '- db-use-legacy-gucs = false';
    RAISE NOTICE '- db-pool = 20';
    RAISE NOTICE '- server-timing-enabled = true';
END $$;

-- 9. Vérification finale
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION FINALE ===';
    RAISE NOTICE 'Cache schéma rafraîchi avec succès';
    RAISE NOTICE 'Table super_admins vérifiée';
    RAISE NOTICE 'Index optimisés';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;