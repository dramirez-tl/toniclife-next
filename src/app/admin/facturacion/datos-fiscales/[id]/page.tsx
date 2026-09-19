// app/admin/facturacion/datos-fiscales/[id]/page.tsx - Editar Datos Fiscales
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { rfcPersonType, satCatalogOptions } from '@/types/billing';
import {
  useCfdiUses,
  useFiscalData,
  useFiscalRegimes,
  useUpdateFiscalData,
  useValidateRfc,
} from '@/hooks/useBilling';

export default function EditFiscalDataPage() {
  const params = useParams();
  const router = useRouter();
  const fiscalDataId = params.id as string;

  const { data: fiscalData, isLoading: isLoadingFiscalData } = useFiscalData(fiscalDataId);
  const updateFiscalData = useUpdateFiscalData();
  const validateRfc = useValidateRfc();

  const [formData, setFormData] = useState({
    rfc: '',
    legalName: '',
    taxRegime: '',
    postalCode: '',
    email: '',
    defaultCfdiUse: '',
  });

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    number: '',
  });

  const [isValidated, setIsValidated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Catálogos SAT del API (ya no listas quemadas): regímenes según el tipo de
  // persona del RFC y usos de CFDI compatibles con el régimen elegido.
  const { data: regimeCatalog } = useFiscalRegimes(rfcPersonType(formData.rfc) ?? undefined);
  const { data: cfdiUseCatalog } = useCfdiUses(formData.taxRegime || undefined);

  useEffect(() => {
    if (fiscalData) {
      setFormData({
        rfc: fiscalData.rfc,
        legalName: fiscalData.legalName,
        taxRegime: fiscalData.taxRegime,
        postalCode: fiscalData.postalCode,
        email: fiscalData.email || '',
        defaultCfdiUse: fiscalData.defaultCfdiUse,
      });
      setCustomerInfo({
        name: fiscalData.legalName,
        number: (fiscalData as any).customer?.customerNumber || '-',
      });
      setIsValidated(fiscalData.isValidated);
    }
  }, [fiscalData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // RFC validation
    if (!formData.rfc) {
      newErrors.rfc = 'El RFC es requerido';
    } else if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(formData.rfc.toUpperCase())) {
      newErrors.rfc = 'El formato del RFC no es válido';
    }

    // Legal name validation
    if (!formData.legalName.trim()) {
      newErrors.legalName = 'La razón social es requerida';
    }

    // Tax regime validation
    if (!formData.taxRegime) {
      newErrors.taxRegime = 'El régimen fiscal es requerido';
    }

    // Postal code validation
    if (!formData.postalCode) {
      newErrors.postalCode = 'El código postal es requerido';
    } else if (!/^[0-9]{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'El código postal debe tener 5 dígitos';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del correo no es válido';
    }

    // CFDI use validation
    if (!formData.defaultCfdiUse) {
      newErrors.defaultCfdiUse = 'El uso de CFDI es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateRfc = async () => {
    if (!formData.rfc) {
      toast.error('Ingresa un RFC para validar');
      return;
    }

    try {
      await validateRfc.mutateAsync(formData.rfc);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateFiscalData.mutateAsync({
        id: fiscalDataId,
        data: {
          rfc: formData.rfc,
          legalName: formData.legalName,
          fiscalRegime: formData.taxRegime,
          postalCode: formData.postalCode,
          cfdiUse: formData.defaultCfdiUse,
          // Sin domicilio: el CFDI 4.0 solo usa el CP fiscal y el API rechaza
          // cualquier campo fuera de su lista blanca (forbidNonWhitelisted).
          email: formData.email,
        },
      });
      router.push('/admin/facturacion/datos-fiscales');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoadingFiscalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Cargando datos fiscales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/facturacion/datos-fiscales"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BuildingOfficeIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Editar Datos Fiscales</h1>
              </div>
              <p className="text-white/80 text-lg">
                Modifica la información fiscal del cliente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Customer Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-7 w-7 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{customerInfo.name}</p>
                <p className="text-sm text-gray-500">Cliente #{customerInfo.number}</p>
              </div>
              {isValidated ? (
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircleIcon className="h-5 w-5" />
                  RFC Validado
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Pendiente Validación
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          {/* Fiscal Information */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Información Fiscal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RFC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) =>
                        setFormData({ ...formData, rfc: e.target.value.toUpperCase() })
                      }
                      maxLength={13}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent font-mono uppercase ${
                        errors.rfc ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="XAXX010101000"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidateRfc}
                      disabled={validateRfc.isPending}
                    >
                      {validateRfc.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Validar
                    </Button>
                  </div>
                  {errors.rfc && (
                    <p className="mt-1 text-sm text-red-500">{errors.rfc}</p>
                  )}
                </div>

                {/* Legal Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) =>
                      setFormData({ ...formData, legalName: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.legalName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nombre o Razón Social como aparece en el SAT"
                  />
                  {errors.legalName && (
                    <p className="mt-1 text-sm text-red-500">{errors.legalName}</p>
                  )}
                </div>

                {/* Tax Regime */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Régimen Fiscal *
                  </label>
                  <SearchableSelect
                    options={satCatalogOptions(regimeCatalog)}
                    value={formData.taxRegime}
                    // Al cambiar el régimen el uso se vacía: los usos válidos dependen de él.
                    onChange={(val) => setFormData({ ...formData, taxRegime: val, defaultCfdiUse: '' })}
                    showAllOption={false}
                    placeholder="Seleccionar régimen..."
                  />
                  {errors.taxRegime && (
                    <p className="mt-1 text-sm text-red-500">{errors.taxRegime}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postalCode: e.target.value.replace(/\D/g, '').slice(0, 5),
                      })
                    }
                    maxLength={5}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="12345"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                  )}
                </div>

                {/* CFDI Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uso de CFDI *
                  </label>
                  <SearchableSelect
                    options={satCatalogOptions(cfdiUseCatalog)}
                    value={formData.defaultCfdiUse}
                    onChange={(val) => setFormData({ ...formData, defaultCfdiUse: val })}
                    showAllOption={false}
                    placeholder="Seleccionar uso de CFDI..."
                  />
                  {errors.defaultCfdiUse && (
                    <p className="mt-1 text-sm text-red-500">{errors.defaultCfdiUse}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address (Optional) */}
          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/admin/facturacion/datos-fiscales">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              variant="default"
              disabled={updateFiscalData.isPending}
            >
              {updateFiscalData.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <CheckCircleIcon className="h-5 w-5" />
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
