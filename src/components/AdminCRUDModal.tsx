import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Lock,
  Sparkles,
  Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminCRUDModalProps {
  isOpen: boolean;
  organisationData: any;
  onComplete: (adminData: any) => void;
}

const AdminCRUDModal: React.FC<AdminCRUDModalProps> = ({
  isOpen,
  organisationData,
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
      // Créer le compte utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nom: formData.nom,
            prenom: formData.prenom,
            phone: formData.phone,
            role: 'admin',
            organisation_id: organisationData.id
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Créer l'entrée dans la table users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            phone: formData.phone,
            role: 'admin',
            organisation_id: organisationData.id,
            est_actif: true
          });

        if (userError) {
          throw userError;
        }

        toast.success('Administrateur créé avec succès !');
        onComplete({
          user: authData.user,
          profile: {
            id: authData.user.id,
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            role: 'admin',
            organisation_id: organisationData.id
          }
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'administrateur:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'administrateur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-800 border-blue-200 dark:border-blue-700">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            Créer l'administrateur
          </DialogTitle>
          <p className="text-blue-600 dark:text-blue-300 mt-2">
            Configurez le compte administrateur pour {organisationData?.nom}
          </p>
        </DialogHeader>

        {/* Informations de l'organisation */}
        <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                {organisationData?.nom}
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Code: {organisationData?.slug}
              </p>
            </div>
          </div>
        </div>

        <Card className="border-blue-200 dark:border-blue-700 bg-white/50 dark:bg-blue-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <User className="w-5 h-5" />
              Informations de l'administrateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom et Prénom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-blue-700 dark:text-blue-300">
                    Prénom *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="prenom"
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => handleInputChange('prenom', e.target.value)}
                      className={`pl-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
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
                  <Label htmlFor="nom" className="text-blue-700 dark:text-blue-300">
                    Nom *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="nom"
                      type="text"
                      value={formData.nom}
                      onChange={(e) => handleInputChange('nom', e.target.value)}
                      className={`pl-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
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
                <Label htmlFor="email" className="text-blue-700 dark:text-blue-300">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
                      errors.email ? 'border-red-500' : ''
                    }`}
                    placeholder="admin@garage.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-blue-700 dark:text-blue-300">
                  Téléphone *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`pl-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
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
                <Label htmlFor="password" className="text-blue-700 dark:text-blue-300">
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
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
                      <EyeOff className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-blue-500" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-blue-700 dark:text-blue-300">
                  Confirmer le mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 ${
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
                      <EyeOff className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-blue-500" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Alert d'information */}
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Cet administrateur aura accès complet à l'organisation {organisationData?.nom} et pourra gérer tous les utilisateurs et données.
                </AlertDescription>
              </Alert>

              {/* Bouton de soumission */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création en cours...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Créer l'administrateur
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

export default AdminCRUDModal;
