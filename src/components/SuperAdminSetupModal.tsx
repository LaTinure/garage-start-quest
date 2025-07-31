import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdminSetupModalProps {
  isOpen: boolean;
  onComplete: (adminData: any) => void;
}

const SuperAdminSetupModal: React.FC<SuperAdminSetupModalProps> = ({
  isOpen,
  onComplete
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    nom: '',
    prenom: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation email
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    // Validation confirmation mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    // Validation téléphone (format CI)
    if (!formData.phone) {
      newErrors.phone = 'Le numéro de téléphone est requis';
    } else if (!/^\+225\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Format: +225 XX XX XX XX XX';
    }

    // Validation nom et prénom
    if (!formData.nom) {
      newErrors.nom = 'Le nom est requis';
    }
    if (!formData.prenom) {
      newErrors.prenom = 'Le prénom est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('225')) {
      const match = cleaned.match(/^225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
      if (match) {
        return `+225 ${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
      }
    }
    return value;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Créer le compte Super-Admin dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nom: formData.nom,
            prenom: formData.prenom,
            phone: formData.phone,
            role: 'superadmin'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Créer l'entrée dans la table super_admins
        const { error: superAdminError } = await supabase
          .from('super_admins')
          .insert({
            user_id: authData.user.id,
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            phone: formData.phone,
            est_actif: true
          });

        if (superAdminError) {
          throw superAdminError;
        }

        // Créer l'entrée dans la table users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            phone: formData.phone,
            role: 'superadmin',
            est_actif: true
          });

        if (userError) {
          throw userError;
        }

        toast.success('Super-Admin créé avec succès !');
        onComplete({
          user: authData.user,
          profile: {
            id: authData.user.id,
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            role: 'superadmin'
          }
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du Super-Admin:', error);
      toast.error(error.message || 'Erreur lors de la création du Super-Admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700"
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-pulse">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-green-800 dark:text-green-200">
            Configuration Super-Admin
          </DialogTitle>
          <DialogDescription className="text-green-600 dark:text-green-300 mt-2">
            Créez le compte administrateur principal pour gérer toutes les organisations
          </DialogDescription>
        </DialogHeader>

        <Card className="border-green-200 dark:border-green-700 bg-white/50 dark:bg-green-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Shield className="w-5 h-5" />
              Informations Super-Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom et Prénom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-green-700 dark:text-green-300">
                    Prénom *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                    <Input
                      id="prenom"
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => handleInputChange('prenom', e.target.value)}
                      className={`pl-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                        errors.prenom ? 'border-red-500' : ''
                      }`}
                      placeholder="Votre prénom"
                    />
                  </div>
                  {errors.prenom && (
                    <p className="text-red-500 text-sm">{errors.prenom}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-green-700 dark:text-green-300">
                    Nom *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                    <Input
                      id="nom"
                      type="text"
                      value={formData.nom}
                      onChange={(e) => handleInputChange('nom', e.target.value)}
                      className={`pl-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                        errors.nom ? 'border-red-500' : ''
                      }`}
                      placeholder="Votre nom"
                    />
                  </div>
                  {errors.nom && (
                    <p className="text-red-500 text-sm">{errors.nom}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-green-700 dark:text-green-300">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                      errors.email ? 'border-red-500' : ''
                    }`}
                    placeholder="votre@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-green-700 dark:text-green-300">
                  Téléphone *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`pl-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                      errors.phone ? 'border-red-500' : ''
                    }`}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-green-700 dark:text-green-300">
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                      errors.password ? 'border-red-500' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-green-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-green-700 dark:text-green-300">
                  Confirmer le mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 ${
                      errors.confirmPassword ? 'border-red-500' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-green-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Alert d'information */}
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700">
                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Ce compte aura accès à toutes les organisations et pourra créer de nouveaux administrateurs.
                </AlertDescription>
              </Alert>

              {/* Bouton de soumission */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création en cours...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Créer le Super-Admin
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdminSetupModal;
