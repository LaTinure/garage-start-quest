# 🚨 URGENT - Fix Erreur POST /create-organisation 400

## Problème Identifié
L'erreur `POST create-organisation 400` est causée par la fonction SQL `creer_organisation` qui n'existe pas dans la base de données.

## Solution Immédiate

### 1. Exécuter ce SQL dans Supabase Dashboard
```sql
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

GRANT EXECUTE ON FUNCTION public.creer_organisation_complete TO anon;
GRANT EXECUTE ON FUNCTION public.creer_organisation_complete TO authenticated;
```

### 2. Modifications Code Nécessaires

**supabase/functions/create-organisation/index.ts** - Ligne 34:
```typescript
// REMPLACER
const { data, error } = await supabase.rpc('creer_organisation', {

// PAR
const { data, error } = await supabase.rpc('creer_organisation_complete', {
  p_nom: nom,
  p_slug: slug,
  p_admin_email: email_admin,
  p_admin_nom: '',
  p_admin_prenom: '',
  p_plan: plan
});
```

**src/components/OrganisationOnboarding.tsx** - Ligne 52:
```typescript
// REMPLACER
onComplete(data.org_id);

// PAR  
onComplete(data.organisation_id || data.org_id);
```

### 3. Redéployer
```bash
supabase functions deploy create-organisation
```

✅ Cela devrait résoudre l'erreur 400 immédiatement !
