import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { nom, slug, email_admin, password, plan = 'monthly' } = await req.json();

    // Validation des données
    if (!nom || !slug || !email_admin || !password) {
      return new Response(
        JSON.stringify({ 
          error: 'Données manquantes',
          required: ['nom', 'slug', 'email_admin', 'password']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🏗️ Création organisation:', { nom, slug, email_admin, plan });

    // Appel de la fonction PostgreSQL améliorée
    const { data, error } = await supabase.rpc('creer_organisation_complete', {
      p_nom: nom,
      p_slug: slug,
      p_admin_email: email_admin,
      p_admin_nom: '', // Vous pourrez ajouter ces champs plus tard
      p_admin_prenom: '',
      p_plan: plan
    });

    if (error) {
      console.error('❌ Erreur création organisation:', error);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          details: error.details || 'Erreur lors de la création de l\'organisation',
          code: error.code || 'UNKNOWN_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Organisation créée avec succès:', data);

    // Les données sont déjà structurées par la fonction SQL
    const orgData = typeof data === 'string' ? JSON.parse(data) : data;

    return new Response(
      JSON.stringify({ 
        success: true, 
        organisation_id: orgData.organisation_id,
        org_id: orgData.organisation_id, // Alias pour compatibilité
        code: orgData.code,
        slug: orgData.slug,
        plan: orgData.plan,
        subscription_type: orgData.subscription_type,
        message: `Organisation "${nom}" créée avec succès!`,
        data: orgData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});