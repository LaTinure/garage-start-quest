import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';

// Pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Connexion from '@/pages/Connexion';
import Dashboard from '@/pages/Dashboard';
import ClientsListe from '@/pages/ClientsListe';
import ClientsAjouter from '@/pages/ClientsAjouter';
import ClientsHistorique from '@/pages/ClientsHistorique';
import Vehicules from '@/pages/Vehicules';
import Reparations from '@/pages/Reparations';
import Stock from '@/pages/Stock';
import Settings from '@/pages/Settings';
import Profil from '@/pages/Profil';
import APropos from '@/pages/APropos';
import Aide from '@/pages/Aide';
import NotFound from '@/pages/NotFound';
import ThirdPartyDemo from '@/pages/ThirdPartyDemo';

// Components
import SimpleAuthGuard from '@/components/SimpleAuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import MultiInstanceSetup from '@/components/MultiInstanceSetup';

// Layout
import UnifiedLayout from '@/layout/UnifiedLayout';
import GlobalLayout from '@/layout/GlobalLayout';

// Créer une instance QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Composant pour gérer la reconnexion automatique
const AutoReconnect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Vérifier la session existante au démarrage
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          const userRole = session.user?.user_metadata?.role || 'user';
          const currentPath = window.location.pathname;
          
          // Ne pas rediriger si on est déjà sur une page appropriée
          if (currentPath.includes('/dashboard') || 
              currentPath.includes('/clients') || 
              currentPath.includes('/vehicules') ||
              currentPath.includes('/reparations') ||
              currentPath.includes('/stock') ||
              currentPath.includes('/settings') ||
              currentPath.includes('/profil') ||
              currentPath.includes('/superadmin')) {
            setIsChecking(false);
            return;
          }

          // Redirection automatique basée sur le rôle
          if (userRole === 'superadmin') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.log('Erreur lors de la vérification de session:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userRole = session.user?.user_metadata?.role || 'user';
        navigate(userRole === 'superadmin' ? '/dashboard' : '/dashboard');
      } else if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Afficher un loader pendant la vérification de session
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Composant principal de contenu de l'app
const AppContent = () => {
  const [setupComplete, setSetupComplete] = useState(false);

  // Workflow multi-instance
  if (!setupComplete) {
    return (
      <MultiInstanceSetup onComplete={() => setSetupComplete(true)}>
        <></>
      </MultiInstanceSetup>
    );
  }

  return (
    <AutoReconnect>
      <GlobalLayout showHeader={true} showFooter={true}>
        <Routes>
          {/* =================== PAGES PUBLIQUES =================== */}
          <Route path="/" element={<Index />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/aide" element={<Aide />} />

        {/* =================== AUTHENTIFICATION =================== */}
        <Route path="/auth" element={
          <SimpleAuthGuard requireAuth={false}>
            <Auth />
          </SimpleAuthGuard>
        } />
        <Route path="/connexion" element={
          <SimpleAuthGuard requireAuth={false}>
            <Connexion />
          </SimpleAuthGuard>
        } />

        {/* =================== ROUTES PROTÉGÉES =================== */}
        <Route path="/dashboard" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Dashboard />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/clients/liste" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <ClientsListe />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/clients/ajouter" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <ClientsAjouter />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/clients/historique" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <ClientsHistorique />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/vehicules" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Vehicules />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/reparations" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Reparations />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/stock" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Stock />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/settings" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Settings />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/profil" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <Profil />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

        <Route path="/third-party-demo" element={
          <SimpleAuthGuard>
            <UnifiedLayout>
              <ThirdPartyDemo />
            </UnifiedLayout>
          </SimpleAuthGuard>
        } />

          {/* =================== PAGE 404 =================== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GlobalLayout>
    </AutoReconnect>
  );
};

// Content without complex providers for now
const AppContentSimple = () => <AppContent />;

// Composant principal App
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AppContentSimple />
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
