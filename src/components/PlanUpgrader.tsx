import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  Check,
  Star,
  Zap,
  Crown,
  Building,
  Users,
  AlertTriangle,
  CreditCard,
  Calendar,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanUpgraderProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'monthly' | 'annual';
  organisationId: string;
  onPlanUpdated: (newPlan: string) => void;
}

interface Plan {
  id: 'free' | 'monthly' | 'annual';
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  color: string;
  icon: React.ComponentType<any>;
  popular?: boolean;
}

const PlanUpgrader: React.FC<PlanUpgraderProps> = ({
  isOpen,
  onClose,
  currentPlan,
  organisationId,
  onPlanUpdated
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Selection, 2: Confirmation, 3: Success
  const [isUpgrading, setIsUpgrading] = useState(false);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0',
      period: '1 semaine',
      description: 'Découverte limitée',
      icon: Star,
      color: 'text-green-600',
      features: ['1 garage seulement', 'Fonctions de base', 'Support email'],
      limitations: ['Durée limitée', 'Redirection obligatoire après expiration']
    },
    {
      id: 'monthly',
      name: 'Mensuel',
      price: '25 000',
      period: 'par mois',
      description: 'Solution flexible',
      icon: Zap,
      color: 'text-orange-600',
      popular: true,
      features: ['1 organisation', '3 instances max', 'Support prioritaire', 'Toutes les fonctionnalités'],
      limitations: ['Limité à 1 organisation', 'Maximum 3 instances']
    },
    {
      id: 'annual',
      name: 'Annuel',
      price: '250 000',
      period: 'par an',
      description: 'Solution complète',
      icon: Crown,
      color: 'text-blue-600',
      features: ['Organisations multiples', 'Instances illimitées', 'Support premium 24/7', 'API complète', 'Formation incluse'],
      limitations: []
    }
  ];

  const getCurrentPlanIndex = () => {
    return plans.findIndex(plan => plan.id === currentPlan);
  };

  const getAvailablePlans = () => {
    const currentIndex = getCurrentPlanIndex();
    return plans.filter((_, index) => index > currentIndex);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setStep(2);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);
    try {
      // Appeler la fonction Edge pour mettre à jour le plan
      const { data, error } = await supabase.functions.invoke('update-plan', {
        body: {
          organisation_id: organisationId,
          new_plan: selectedPlan
        }
      });

      if (error) throw error;

      // Mettre à jour localement aussi
      const { error: updateError } = await supabase
        .from('organisations')
        .update({ 
          subscription_type: selectedPlan === 'annual' ? 'lifetime' : 'monthly',
          plan_abonnement: selectedPlan
        })
        .eq('id', organisationId);

      if (updateError) throw updateError;

      setStep(3);
      onPlanUpdated(selectedPlan);
      
      toast.success('Plan mis à jour avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du plan:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du plan');
    } finally {
      setIsUpgrading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNumber 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step > stepNumber ? <Check className="w-4 h-4" /> : stepNumber}
            </div>
            {stepNumber < 3 && (
              <ArrowRight className={`w-4 h-4 mx-2 ${
                step > stepNumber ? 'text-blue-600' : 'text-gray-400'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => {
    const availablePlans = getAvailablePlans();

    if (availablePlans.length === 0) {
      return (
        <div className="text-center py-8">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Vous avez déjà le meilleur plan !</h3>
          <p className="text-gray-600">Votre plan actuel est le plus avancé disponible.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Choisissez votre nouveau plan</h3>
          <p className="text-gray-600">
            Plan actuel : <Badge variant="outline">{plans.find(p => p.id === currentPlan)?.name}</Badge>
          </p>
        </div>

        <div className="grid gap-4">
          {availablePlans.map((plan) => {
            const PlanIcon = plan.icon;
            return (
              <Card 
                key={plan.id}
                className="relative cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-blue-300"
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500">
                    <Star className="w-3 h-3 mr-1" />
                    Populaire
                  </Badge>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <PlanIcon className={`w-5 h-5 ${plan.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {plan.price === '0' ? 'Gratuit' : `${plan.price} FCFA`}
                      </p>
                      <p className="text-sm text-gray-500">/{plan.period}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Inclus :</h4>
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.limitations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Limitations :
                        </h4>
                        <ul className="space-y-1">
                          {plan.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-amber-600">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button className="w-full mt-4" variant="outline">
                    Choisir ce plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return null;

    const PlanIcon = plan.icon;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Confirmer la mise à niveau</h3>
          <p className="text-gray-600">Vérifiez les détails de votre nouveau plan</p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PlanIcon className={`w-6 h-6 ${plan.color}`} />
              </div>
              <div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-lg font-semibold">
                  {plan.price === '0' ? 'Gratuit' : `${plan.price} FCFA`} /{plan.period}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Fonctionnalités incluses
                </h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Changements immédiats
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    Activation immédiate
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    Accès aux nouvelles fonctionnalités
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    Support niveau supérieur
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
            Retour
          </Button>
          <Button 
            onClick={handleUpgrade} 
            disabled={isUpgrading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isUpgrading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mise à niveau...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Confirmer la mise à niveau
              </div>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return null;

    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">Mise à niveau réussie !</h3>
          <p className="text-gray-600">
            Votre organisation utilise maintenant le plan <strong>{plan.name}</strong>
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nouveau plan :</span>
                <p className="text-green-700">{plan.name}</p>
              </div>
              <div>
                <span className="font-medium">Prix :</span>
                <p className="text-green-700">
                  {plan.price === '0' ? 'Gratuit' : `${plan.price} FCFA`} /{plan.period}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onClose} className="w-full">
          Retour au tableau de bord
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Mise à niveau de votre plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Étape {step} sur 3 - {
              step === 1 ? 'Sélection du plan' :
              step === 2 ? 'Confirmation' : 'Terminé'
            }
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="px-2">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgrader;