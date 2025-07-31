import React, { Suspense, memo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface LazyModalWrapperProps {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  loadingMessage?: string;
}

/**
 * Wrapper optimisé pour le chargement lazy des modales
 * Améliore les performances en différant le chargement des composants lourds
 */
const LazyModalWrapper: React.FC<LazyModalWrapperProps> = memo(({
  isOpen,
  onOpenChange,
  children,
  className = "sm:max-w-4xl",
  loadingMessage = "Chargement..."
}) => {
  // Composant de fallback avec animation de chargement
  const LoadingFallback = () => (
    <DialogContent className={`${className} flex items-center justify-center p-8`}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {loadingMessage}
        </p>
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </Dialog>
  );
});

LazyModalWrapper.displayName = 'LazyModalWrapper';

export default LazyModalWrapper;