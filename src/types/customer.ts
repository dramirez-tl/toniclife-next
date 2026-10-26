// Customer/Distributor types for the frontend
// Aligned with backend DTOs: toniclife-api/src/modules/customers/dto/

export type CustomerType = 'retail' | 'distributor' | 'preferred';
export type CustomerStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type AddressType = 'shipping' | 'billing';

export interface SponsorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  type: AddressType;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** countries.id (el API lo manda; el formulario del admin lo usa para el país del domicilio). */
  countryId?: string | null;
  phone: string | null;
  /** Alias (Casa, Oficina…) y referencias de ubicación. */
  alias?: string | null;
  reference?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CustomerBankAccount {
  id: string;
  customerId: string;
  bankName: string | null;
  accountNumber: string | null;
  clabe: string | null;
  swiftCode: string | null;
  accountHolder: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  lastNameMother: string | null;
  email: string;
  phone: string | null;
  birthDate: string | null;
  photoUrl: string | null;

  // Datos fiscales
  rfc: string | null;
  curp: string | null;
  ineNumber: string | null;
  nss: string | null;
  taxRegime: string | null;

  // Relaciones (IDs)
  priceTypeId: string | null;
  branchId: string | null;
  countryId: string | null;

  // MLM
  sponsorId: string | null;
  uplineId: string | null;
  sponsor: SponsorInfo | null;
  kitType: string | null;
  customerNumber: string | null;
  customerType: string;
  rankId: string | null;
  languageCode: string | null;
  registrationDate: string | null;

  // Estado
  isActive: boolean;
  termsAccepted: boolean;
  isOnlineRegistration: boolean;
  membershipPaid: boolean;
  status: string;
  termsAcceptedAt: string | null;

  createdAt: string;
  updatedAt: string | null;

  // CEDEA
  cedeaCount?: number;

  // Sub-resources (populated on demand)
  addresses?: CustomerAddress[];
  bankAccounts?: CustomerBankAccount[];
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  firstName?: string;
  lastName?: string;
  mothersLastName?: string;
  customerNumber?: string;
  customerType?: string;
  status?: CustomerStatus;
  countryId?: string;
  hasCedea?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  lastNameMother?: string;
  email: string;
  phone?: string;
  birthDate?: string;

  // Datos fiscales
  rfc?: string;
  curp?: string;
  taxRegime?: string;

  // Relaciones (required)
  priceTypeId: string;
  branchId: string;
  countryId?: string;

  // MLM
  sponsorId?: string;
  uplineId?: string;
  kitType?: string;
  customerType?: string;
  languageCode?: string;
  registrationDate?: string;
  isOnlineRegistration?: boolean;
  status?: CustomerStatus;
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  lastNameMother?: string;
  /** null = quitar el correo (solo super_admin): el distribuidor registra
   *  uno al entrar al portal. */
  email?: string | null;
  phone?: string;
  birthDate?: string;
  rfc?: string;
  curp?: string;
  taxRegime?: string;
  priceTypeId?: string;
  branchId?: string;
  countryId?: string;
  sponsorId?: string;
  uplineId?: string;
  kitType?: string;
  customerType?: string;
  languageCode?: string;
  registrationDate?: string;
  isOnlineRegistration?: boolean;
  status?: CustomerStatus;
}

export interface CreateAddressDto {
  type: AddressType;
  alias?: string;
  street: string;
  /** Opcional en países donde el número va dentro de la calle (US, GT, CO). */
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode?: string;
  /** countries.id del domicilio. */
  countryId?: string;
  phone?: string;
  reference?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  type?: AddressType;
  alias?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryId?: string;
  /** null = borrar el teléfono guardado. */
  phone?: string | null;
  reference?: string;
  isDefault?: boolean;
}

export interface CreateBankAccountDto {
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  swiftCode?: string;
  accountHolder?: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountDto {
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  swiftCode?: string;
  accountHolder?: string;
  isDefault?: boolean;
}

// Legacy aliases for backward compatibility
export type KitType = string;
