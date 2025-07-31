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

    const { organisation_id, new_plan } = await req.json();

    // Validation des données
    if (!organisation_id || !new_plan) {
      return new Response(
        JSON.stringify({ 
          error: 'Données manquantes',
          required: ['organisation_id', 'new_plan']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider que le plan existe
    const validPlans = ['free', 'monthly', 'annual'];
    if (!validPlans.includes(new_plan)) {
      return new Response(
        JSON.stringify({ 
          error: 'Plan invalide',
          valid_plans: validPlans
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Mise à jour du plan:', { organisation_id, new_plan });

    // Mapper les plans vers les types de subscription de la DB
    let subscription_type: string;
    let plan_details: any = {};

    switch (new_plan) {
      case 'free':
        subscription_type = 'monthly'; // Plan gratuit temporaire
        plan_details = {
          max_organisations: 1,
          max_instances: 1,
          trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        };
        break;
      case 'monthly':
        subscription_type = 'monthly';
        plan_details = {
          max_organisations: 1,
          max_instances: 3,
          trial_end: null,
        };
        break;
      case 'annual':
        subscription_type = 'lifetime';
        plan_details = {
          max_organisations: null, // Illimité
          max_instances: null, // Illimité
          trial_end: null,
        };
        break;
      default:
        subscription_type = 'monthly';
    }

    // Vérifier que l'organisation existe
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('id, name, subscription_type')
      .eq('id', organisation_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ 
          error: 'Organisation non trouvée',
          details: orgError?.message
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour l'organisation
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organisations')
      .update({
        subscription_type,
        plan_abonnement: new_plan,
        updated_at: new Date().toISOString(),
        ...plan_details
      })
      .eq('id', organisation_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour organisation:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la mise à jour',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log de l'activité (optionnel)
    try {
      await supabase
        .from('activity_logs')
        .insert({
          organisation_id,
          action: 'plan_update',
          details: {
            old_plan: org.subscription_type,
            new_plan: new_plan,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.warn('⚠️ Erreur lors du log d\'activité:', logError);
      // Ne pas faire échouer la requête pour un problème de log
    }

    console.log('✅ Plan mis à jour avec succès:', {
      organisation_id,
      old_plan: org.subscription_type,
      new_plan,
      subscription_type
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        organisation_id,
        old_plan: org.subscription_type,
        new_plan,
        subscription_type,
        organisation: updatedOrg,
        message: `Plan mis à jour vers "${new_plan}" avec succès!`
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