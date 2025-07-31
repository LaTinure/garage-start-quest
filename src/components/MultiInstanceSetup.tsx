import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SplashScreen from '@/components/SplashScreen';
import PricingModal from '@/components/PricingModal';
import SuperAdminSetupModal from '@/components/SuperAdminSetupModal';
import { OrganisationOnboarding } from '@/components/OrganisationOnboarding';
import BrandSetupWizard from '@/components/BrandSetupWizard';

interface MultiInstanceSetupProps {
  onComplete: () => void;
  children: React.ReactNode;
}

export type SetupStep = 'splash' | 'pricing' | 'super-admin' | 'organisation' | 'brand' | 'complete' | 'redirect-auth';

const MultiInstanceSetup: React.FC<MultiInstanceSetupProps> = ({ onComplete, children }) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('splash');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [superAdminData, setSuperAdminData] = useState<any>(null);
  const [organisationId, setOrganisationId] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkExistingSetup();
  }, []);

  const checkExistingSetup = async () => {
    try {
      // Vérifier si on force le setup via URL (?force-setup=true)
      const forceSetup = searchParams.get('force-setup') === 'true';
      
      if (forceSetup) {
        console.log('🔧 Setup forcé via paramètre URL - Ignorer la configuration existante');
        setTimeout(() => setCurrentStep('pricing'), 2000);
        return;
      }

      console.log('🔍 Vérification de la configuration existante...');

      // Vérifier s'il y a des super-admins actifs
      const { data: superAdmins, error: superAdminError } = await supabase
        .from('super_admins')
        .select('id, est_actif, email')
        .eq('est_actif', true)
        .limit(1);

      if (superAdminError) {
        console.error('Erreur lors de la vérification des super-admins:', superAdminError);
        // En cas d'erreur de schéma, rediriger vers setup
        setTimeout(() => setCurrentStep('pricing'), 2000);
        return;
      }

      console.log('Super-admins trouvés:', superAdmins?.length || 0);

      // Si des super-admins existent, vérifier s'il y a des organisations
      if (superAdmins && superAdmins.length > 0) {
        const { data: organisations, error: orgError } = await supabase
          .from('organisations')
          .select('id, is_active, name')
          .eq('is_active', true)
          .limit(1);

        if (orgError) {
          console.error('Erreur lors de la vérification des organisations:', orgError);
          setTimeout(() => setCurrentStep('pricing'), 2000);
          return;
        }

        console.log('Organisations trouvées:', organisations?.length || 0);

        // Si des organisations existent, vérifier les utilisateurs
        if (organisations && organisations.length > 0) {
          // Vérifier s'il y a des utilisateurs (au moins l'admin)
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, role, est_actif')
            .eq('est_actif', true)
            .limit(1);

          if (usersError) {
            console.error('Erreur lors de la vérification des utilisateurs:', usersError);
            setTimeout(() => setCurrentStep('pricing'), 2000);
            return;
          }

          console.log('Utilisateurs trouvés:', users?.length || 0);

          // Si tout existe (Super-Admin + Organisation + Utilisateurs), rediriger vers auth
          if (users && users.length > 0) {
            console.log('✅ Configuration complète détectée:');
            console.log('  - Super-Admin:', superAdmins[0].email);
            console.log('  - Organisation:', organisations[0].name);
            console.log('  - Utilisateurs:', users.length);
            console.log('📱 Redirection vers authentification...');
            
            setCurrentStep('redirect-auth');
            // Rediriger vers la page d'authentification après un court délai
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 2500); // Délai un peu plus long pour lire le message
            return;
          }
        }
      }

      // Si configuration incomplète, commencer le workflow de setup
      console.log('⚙️ Configuration incomplète - Démarrage du workflow de setup');
      setTimeout(() => setCurrentStep('pricing'), 2000);
    } catch (error) {
      console.error('Erreur lors de la vérification de la configuration:', error);
      setTimeout(() => setCurrentStep('pricing'), 2000);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setCurrentStep('super-admin');
  };

  const handleSuperAdminCreated = (adminData: any) => {
    setSuperAdminData(adminData);
    setCurrentStep('organisation');
  };

  const handleOrganisationCreated = (orgId: string) => {
    setOrganisationId(orgId);
    setCurrentStep('brand');
  };

  const handleBrandSetupComplete = () => {
    setCurrentStep('complete');
    onComplete();
  };

  // Fonction pour forcer le setup
  const forceSetup = () => {
    console.log('🔧 Setup forcé manuellement');
    setCurrentStep('pricing');
  };

  // Render selon l'étape actuelle
  switch (currentStep) {
    case 'splash':
      return <SplashScreen onComplete={() => setCurrentStep('pricing')} />;

    case 'redirect-auth':
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-3">Application configurée</h2>
            <p className="text-green-600 mb-4">
              Super-Admin, Organisation et Utilisateurs détectés.
            </p>
            <p className="text-green-500 text-sm mb-6">
              Redirection vers la page de connexion...
            </p>
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            
            {/* Option pour forcer le setup si nécessaire */}
            <button 
              onClick={forceSetup}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reconfigurer l'application
            </button>
          </div>
        </div>
      );

    case 'pricing':
      return (
        <PricingModal 
          isOpen={true} 
          onSelectPlan={handlePlanSelection}
        />
      );

    case 'super-admin':
      return (
        <SuperAdminSetupModal
          isOpen={true}
          onComplete={handleSuperAdminCreated}
        />
      );

    case 'organisation':
      return (
        <OrganisationOnboarding
          isOpen={true}
          onComplete={handleOrganisationCreated}
          plan={selectedPlan}
        />
      );

    case 'brand':
      return (
        <BrandSetupWizard
          isOpen={true}
          onComplete={handleBrandSetupComplete}
        />
      );

    case 'complete':
    default:
      return <>{children}</>;
  }
};

export default MultiInstanceSetup;