'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  PhoneIcon,
  IdentificationIcon,
  UserGroupIcon,
  GiftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { publicRegistrationService, SponsorInfo } from '@/services';

type KitType = 'basico' | 'premium' | 'preferente';

interface KitOption {
  id: KitType;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const kitOptions: KitOption[] = [
  {
    id: 'basico',
    name: 'Kit Básico',
    price: '$1,500 MXN',
    description: 'Ideal para comenzar tu negocio',
    features: [
      'Productos de demostración',
      'Material de apoyo digital',
      'Acceso a plataforma de distribuidor',
      'Capacitación inicial',
    ],
  },
  {
    id: 'premium',
    name: 'Kit Premium',
    price: '$3,500 MXN',
    description: 'El más vendido',
    features: [
      'Productos de demostración ampliados',
      'Material de apoyo físico y digital',
      'Acceso completo a plataforma',
      'Capacitación avanzada',
      'Soporte prioritario',
    ],
    popular: true,
  },
  {
    id: 'preferente',
    name: 'Kit Preferente',
    price: '$6,000 MXN',
    description: 'Para emprendedores serios',
    features: [
      'Todos los productos principales',
      'Material de marketing completo',
      'Acceso VIP a plataforma',
      'Mentoría personalizada',
      'Soporte 24/7',
      'Bonificación de inicio',
    ],
  },
];

function RegistroDistribuidorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sponsor validation
  const [sponsorInfo, setSponsorInfo] = useState<SponsorInfo | null>(null);
  const [sponsorValidating, setSponsorValidating] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  // Email validation
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Sponsor & Kit
    sponsorCode: '',
    kitType: '' as KitType | '',

    // Step 2: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    birthDate: '',

    // Step 3: Fiscal Info (optional)
    rfc: '',
    curp: '',

    // Step 4: Account
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize sponsor code from URL params
  useEffect(() => {
    const refCode = searchParams.get('ref') || searchParams.get('sponsor');
    if (refCode) {
      setFormData(prev => ({ ...prev, sponsorCode: refCode }));
      validateSponsorCode(refCode);
    }
  }, [searchParams]);

  // Validate sponsor code
  const validateSponsorCode = useCallback(async (code: string) => {
    if (!code || code.length < 4) {
      setSponsorInfo(null);
      setSponsorError(null);
      return;
    }

    setSponsorValidating(true);
    setSponsorError(null);

    try {
      const sponsor = await publicRegistrationService.validateSponsorCode(code);
      if (sponsor) {
        setSponsorInfo(sponsor);
        setSponsorError(null);
      } else {
        setSponsorInfo(null);
        setSponsorError('Código de patrocinador no válido o inactivo');
      }
    } catch {
      setSponsorInfo(null);
      setSponsorError('Error al validar el código');
    } finally {
      setSponsorValidating(false);
    }
  }, []);

  // Debounced sponsor code validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.sponsorCode) {
        validateSponsorCode(formData.sponsorCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.sponsorCode, validateSponsorCode]);

  // Check email availability
  const checkEmail = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    try {
      const available = await publicRegistrationService.checkEmailAvailability(email);
      setEmailAvailable(available);
    } catch {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  }, []);

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmail(formData.email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, checkEmail]);

  const passwordRequirements = [
    { text: 'Al menos 8 caracteres', met: formData.password.length >= 8 },
    { text: 'Una letra mayúscula', met: /[A-Z]/.test(formData.password) },
    { text: 'Una letra minúscula', met: /[a-z]/.test(formData.password) },
    { text: 'Un número', met: /[0-9]/.test(formData.password) },
    { text: 'Un carácter especial (@$!%*?&#^_-+=.)', met: /[@$!%*?&#^_\-+=.]/.test(formData.password) },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.sponsorCode) {
          newErrors.sponsorCode = 'El código de patrocinador es requerido';
        } else if (!sponsorInfo) {
          newErrors.sponsorCode = 'Código de patrocinador inválido';
        }
        if (!formData.kitType) {
          newErrors.kitType = 'Selecciona un kit de inicio';
        }
        break;

      case 2:
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'El nombre es requerido';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Los apellidos son requeridos';
        }
        if (!formData.email) {
          newErrors.email = 'El email es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Email inválido';
        } else if (emailAvailable === false) {
          newErrors.email = 'Este email ya está registrado';
        }
        if (!formData.phone) {
          newErrors.phone = 'El teléfono es requerido';
        }
        break;

      case 3:
        // RFC and CURP are optional, but if provided, validate format
        if (formData.rfc && !/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(formData.rfc)) {
          newErrors.rfc = 'RFC inválido';
        }
        if (formData.curp && !/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i.test(formData.curp)) {
          newErrors.curp = 'CURP inválido';
        }
        break;

      case 4:
        if (!formData.password) {
          newErrors.password = 'La contraseña es requerida';
        } else if (!passwordRequirements.every(req => req.met)) {
          newErrors.password = 'La contraseña no cumple los requisitos';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }
        if (!formData.acceptTerms) {
          newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(4)) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await publicRegistrationService.registerDistributor({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        secondaryPhone: formData.secondaryPhone || undefined,
        birthDate: formData.birthDate || undefined,
        rfc: formData.rfc || undefined,
        curp: formData.curp || undefined,
        sponsorCode: formData.sponsorCode,
        kitType: formData.kitType as KitType,
        acceptTerms: formData.acceptTerms,
      });

      toast.success(result.message);

      // Redirect to success page with info
      router.push(`/registro/distribuidor/exitoso?referralCode=${result.referralCode}&sponsor=${encodeURIComponent(result.sponsorName)}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || 'Error al registrar. Intenta de nuevo.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Patrocinador y Kit' },
    { number: 2, title: 'Datos Personales' },
    { number: 3, title: 'Datos Fiscales' },
    { number: 4, title: 'Crear Cuenta' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/logo-text-dark.png"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Únete como Distribuidor
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Comienza tu negocio de bienestar con Tonic Life
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.number
                      ? 'bg-[#3E667D] border-[#3E667D] text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    step.number
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-1 mx-2 ${
                      currentStep > step.number ? 'bg-[#3E667D]' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-sm font-medium text-gray-600">
            {steps[currentStep - 1].title}
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Sponsor & Kit */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
                      Código de Patrocinador
                    </h3>

                    <Input
                      label="Código de tu patrocinador"
                      placeholder="Ej: ABC123XY"
                      value={formData.sponsorCode}
                      onChange={(e) => setFormData({ ...formData, sponsorCode: e.target.value.toUpperCase() })}
                      error={errors.sponsorCode || sponsorError || undefined}
                      helperText="Ingresa el código de referido del distribuidor que te invitó"
                      leftIcon={<IdentificationIcon className="h-5 w-5" />}
                    />

                    {sponsorValidating && (
                      <p className="mt-2 text-sm text-gray-500">Validando código...</p>
                    )}

                    {sponsorInfo && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircleIcon className="h-5 w-5" />
                          <span className="font-medium">Patrocinador válido</span>
                        </div>
                        <p className="mt-1 text-sm text-green-600">
                          {sponsorInfo.firstName} {sponsorInfo.lastName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Kit selection temporarily disabled */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Registro temporalmente no disponible
                    </h3>
                    <p className="text-sm text-gray-600">
                      La selección de kits de inicio se encuentra en mantenimiento. Por favor, intenta más tarde.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Info */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-[#3E667D]" />
                    Datos Personales
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre(s)"
                      placeholder="Juan Carlos"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      error={errors.firstName}
                      leftIcon={<UserIcon className="h-5 w-5" />}
                      autoComplete="given-name"
                    />
                    <Input
                      label="Apellidos"
                      placeholder="Pérez González"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      error={errors.lastName}
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="relative">
                    <Input
                      label="Correo electrónico"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                      autoComplete="email"
                    />
                    {emailChecking && (
                      <span className="absolute right-3 top-9 text-sm text-gray-400">
                        Verificando...
                      </span>
                    )}
                    {!emailChecking && emailAvailable === true && formData.email && (
                      <CheckCircleIcon className="absolute right-3 top-9 h-5 w-5 text-green-500" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Teléfono principal"
                      type="tel"
                      placeholder="+52 55 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      error={errors.phone}
                      leftIcon={<PhoneIcon className="h-5 w-5" />}
                      autoComplete="tel"
                    />
                    <Input
                      label="Teléfono secundario (opcional)"
                      type="tel"
                      placeholder="+52 55 8765 4321"
                      value={formData.secondaryPhone}
                      onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                      autoComplete="tel"
                    />
                  </div>

                  <Input
                    label="Fecha de nacimiento (opcional)"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    error={errors.birthDate}
                  />
                </div>
              )}

              {/* Step 3: Fiscal Info */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <IdentificationIcon className="h-5 w-5 text-[#3E667D]" />
                      Datos Fiscales (Opcional)
                    </h3>
                    <p className="text-sm text-gray-500">
                      Estos datos son opcionales pero necesarios para generar facturas
                    </p>
                  </div>

                  <Input
                    label="RFC"
                    placeholder="PEGJ900515ABC"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    error={errors.rfc}
                    helperText="13 caracteres para personas físicas"
                  />

                  <Input
                    label="CURP"
                    placeholder="PEGJ900515HDFRRL09"
                    value={formData.curp}
                    onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                    error={errors.curp}
                    helperText="18 caracteres"
                  />

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Nota:</strong> Puedes completar esta información más adelante desde tu perfil de distribuidor.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Account Creation */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <LockClosedIcon className="h-5 w-5 text-[#3E667D]" />
                    Crea tu Cuenta
                  </h3>

                  <div className="relative">
                    <Input
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        // Clear password error when user starts typing
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: '' }));
                        }
                      }}
                      error={errors.password}
                      leftIcon={<LockClosedIcon className="h-5 w-5" />}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Requisitos de contraseña:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircleIcon
                              className={`h-4 w-4 ${
                                req.met ? 'text-[#3E667D]' : 'text-gray-300'
                              }`}
                            />
                            <span className={`text-xs ${
                              req.met ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      label="Confirmar contraseña"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        // Clear confirm password error when user starts typing
                        if (errors.confirmPassword) {
                          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                      error={errors.confirmPassword}
                      leftIcon={<LockClosedIcon className="h-5 w-5" />}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 pt-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                        className="mt-1 h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                      />
                      <span className="text-sm text-gray-600">
                        Acepto los{' '}
                        <Link href="/terminos" className="text-[#3E667D] hover:text-[#3E667D] underline" target="_blank">
                          términos y condiciones
                        </Link>
                        , la{' '}
                        <Link href="/privacidad" className="text-[#3E667D] hover:text-[#3E667D] underline" target="_blank">
                          política de privacidad
                        </Link>
                        {' '}y el{' '}
                        <Link href="/contrato-distribuidor" className="text-[#3E667D] hover:text-[#3E667D] underline" target="_blank">
                          contrato de distribuidor
                        </Link>
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <p className="text-sm text-red-500">{errors.acceptTerms}</p>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Resumen de tu registro</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Kit seleccionado:</dt>
                        <dd className="font-medium text-gray-900">
                          {kitOptions.find(k => k.id === formData.kitType)?.name || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Patrocinador:</dt>
                        <dd className="font-medium text-gray-900">
                          {sponsorInfo ? `${sponsorInfo.firstName} ${sponsorInfo.lastName}` : '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Email:</dt>
                        <dd className="font-medium text-gray-900">{formData.email || '-'}</dd>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <dt className="text-gray-500">Total a pagar:</dt>
                        <dd className="font-bold text-[#3E667D]">
                          {kitOptions.find(k => k.id === formData.kitType)?.price || '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                  >
                    Anterior
                  </Button>
                ) : (
                  <Link href="/registro">
                    <Button type="button" variant="outline">
                      Volver
                    </Button>
                  </Link>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep}
                    disabled={currentStep === 1}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registrando...' : 'Completar Registro'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Link */}
        <div className="mt-6 text-center text-sm text-gray-500">
          ¿Tienes dudas?{' '}
          <Link href="/contacto" className="text-[#3E667D] hover:text-[#3E667D]">
            Contáctanos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegistroDistribuidorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <RegistroDistribuidorContent />
    </Suspense>
  );
}
