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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fixe unifié en haut */}
      {showHeader && isAuthenticated && (
        <Header />
      )}
      
      {/* Contenu principal avec padding approprié */}
      <main className="flex-1 main-content">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>

      {/* Footer statique en bas */}
      {showFooter && isAuthenticated && (
        <Footer />
      )}
    </div>
  );
};

export default UnifiedLayout;
