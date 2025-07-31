# 🚨 URGENT: Fix Erreur create-organisation 400

## Problème
L'erreur POST 400 sur create-organisation persiste car la fonction SQL `creer_organisation_complete` n'existe pas.

## Solution Immédiate

### 1. Exécuter ce SQL dans Supabase Dashboard:

```sql
-- Créer la fonction creer_organisation_complete
CREATE OR REPLACE FUNCTION public.creer_organisation_complete(
    p_nom TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_nom TEXT DEFAULT NULL,
    p_admin_prenom TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT 'monthly'
) RETURNS JSON AS $$
DECLARE
    v_organisation_id UUID;
    v_code TEXT;
    v_result JSON;
    v_subscription_type TEXT;
BEGIN
    -- Générer code unique
    v_code := upper(left(replace(p_slug, '-', ''), 6)) || to_char(extract(epoch from now())::integer % 10000, 'FM0000');
    
    -- Vérifier unicité slug
    IF EXISTS (SELECT 1 FROM public.organisations WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Le slug "%" existe déjà', p_slug;
    END IF;
    
    -- Mapper les plans
    CASE p_plan
        WHEN 'free' THEN v_subscription_type := 'monthly';
        WHEN 'monthly' THEN v_subscription_type := 'monthly';  
        WHEN 'annual' THEN v_subscription_type := 'lifetime';
        ELSE v_subscription_type := 'monthly';
    END CASE;
    
    -- Créer organisation
    INSERT INTO public.organisations (name, code, slug, subscription_type, is_active, email)
    VALUES (p_nom, v_code, p_slug, v_subscription_type, true, p_admin_email)
    RETURNING id INTO v_organisation_id;
    
    -- Retourner résultat
    v_result := json_build_object(
        'organisation_id', v_organisation_id,
        'code', v_code,
        'nom', p_nom,
        'slug', p_slug,
        'plan', p_plan,
        'subscription_type', v_subscription_type
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.creer_organisation_complete TO anon;
GRANT EXECUTE ON FUNCTION public.creer_organisation_complete TO authenticated;
```

### 2. Vérifier la structure de la table organisations:

```sql
-- Si la table n'a pas les bonnes colonnes, les ajouter:
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS subscription_type TEXT;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS email TEXT;
```

### 3. Si la table organisations n'existe pas du tout:

```sql
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    slug TEXT UNIQUE,
    subscription_type TEXT DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT true,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Redéployer la fonction Edge:

```bash
supabase functions deploy create-organisation
```

## Test Rapide

Après avoir exécuté le SQL, testez en créant une organisation depuis l'interface.

**L'erreur 400 devrait être résolue immédiatement !**
