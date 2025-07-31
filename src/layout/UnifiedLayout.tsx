import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface UnifiedLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showNavbar?: boolean;
}

const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  showNavbar = true
}) => {
  const { isAuthenticated } = useSimpleAuth();

  // Ne pas afficher le header/footer sur les pages d'auth
  const isAuthPage = window.location.pathname.includes('/auth') ||
                     window.location.pathname.includes('/create-organisation') ||
                     window.location.pathname === '/';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header fixe en haut - UN SEUL */}
      {showHeader && isAuthenticated && (
        <Header />
      )}
      
      {/* Contenu principal qui pousse le footer en bas */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="min-h-[calc(100vh-140px)]">
            {children}
          </div>
        </div>
      </main>

      {/* Footer statique en bas - UN SEUL */}
      {showFooter && isAuthenticated && (
        <Footer />
      )}
    </div>
  );
};

export default UnifiedLayout;
