import api from '@/lib/axios';
import { writeAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';
import type { GoogleSignupBody, RegisterBody } from '@/lib/public-signup';

// Types
export interface LoginCredentials {
  identifier: string;
  password: string;
  remember?: boolean;
}

export interface EmailLinkRequired {
  requiresEmailLink: true;
  linkToken: string;
  distributorName: string;
  legacyId: string;
}

export interface LinkEmailData {
  linkToken: string;
  email: string;
}

export interface VerifyLinkEmailData {
  linkToken: string;
  code: string;
}

export type LoginResult = AuthResponse | EmailLinkRequired;

export function isEmailLinkRequired(result: LoginResult): result is EmailLinkRequired {
  return 'requiresEmailLink' in result && result.requiresEmailLink === true;
}

// ---- Google Sign-In (API: POST /auth/google, /auth/google/link, /auth/google/signup, /auth/link-email/google)
export interface GoogleAuthStatus {
  enabled: boolean;
  webClientId: string | null;
}

/**
 * La cuenta de Google no está vinculada a ningún usuario. Qué sigue depende de `canSignUp`
 * (ver `googleLinkStep` en lib/public-signup): crear la cuenta del público con ese correo
 * o vincular una cuenta que ya existe con ID + contraseña.
 */
export interface GoogleLinkRequired {
  requiresAccountLink: true;
  /** Ticket de 10 min para terminar: POST /auth/google/link o /auth/google/signup. */
  linkTicket: string;
  email: string;
  name: string | null;
  picture: string | null;
  /**
   * true = nadie tiene cuenta con esa cuenta de Google ni con ese correo y la tienda está
   * abriendo cuentas: se puede crear una de cliente. false = ya hay una cuenta con ese
   * correo (se vincula con ID y contraseña) o la tienda está en "solo miembros". Ausente
   * en un API anterior: cuenta como false.
   */
  canSignUp?: boolean;
}

export type GoogleLoginResult = AuthResponse | GoogleLinkRequired;

export function isGoogleLinkRequired(result: GoogleLoginResult): result is GoogleLinkRequired {
  return 'requiresAccountLink' in result && result.requiresAccountLink === true;
}

export interface GoogleLoginData {
  idToken: string;
  remember?: boolean;
}

export interface GoogleLinkData {
  linkTicket: string;
  identifier: string;
  password: string;
  remember?: boolean;
}

export interface LinkEmailGoogleData {
  linkToken: string;
  idToken: string;
}

/** Opciones de la sesión que se abre al crear la cuenta. */
export interface SignupSessionOptions {
  /** Sesión que sobrevive al cierre del navegador (como "Recordarme" en /login). */
  remember?: boolean;
}

/**
 * Cuerpo de POST /auth/register. El API rechaza propiedades de más: se arma con
 * `buildRegisterBody` (lib/public-signup), nunca con el estado crudo del formulario.
 */
export type RegisterData = RegisterBody;

/** Tipo de cuenta del cliente enlazado al usuario (customers.customer_type). */
export type CustomerType = 'distributor' | 'preferred_customer' | 'final_customer';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  /** Miniatura (256 px) de la foto del expediente, firmada. */
  avatarUrl: string | null;
  /** Foto original del expediente (para verla en grande). Ausente en
   *  respuestas previas a oct-2026. */
  photoUrl?: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  roles: string[];
  permissions: string[];
  /** Categoría del rol ('colaborador' = panel admin, 'cliente' = portal
   *  distribuidor). El front rutea por esta categoría; ausente solo en
   *  respuestas del API previas a ago-2026. */
  roleCategory?: string;
  customerId?: string;
  /**
   * Tipo de cuenta del cliente: distribuidor, cliente preferente o `final_customer` (la
   * cuenta que abre el público en la tienda: sin red, puntos ni panel de distribuidor;
   * ver lib/auth-area.ts). Ausente en colaboradores y en un API anterior al 11-nov-2026.
   */
  customerType?: CustomerType | (string & {});
  countryCode?: string;
  currencyCode?: string;
  defaultBranchId?: string;
  defaultBranchName?: string;
  /** Departamento/área del colaborador (users.department_id); null para
   *  distribuidores y usuarios sin área. Ausente en respuestas previas a oct-2026. */
  departmentName?: string | null;
  /** Sucursales a las que está acotada la sesión (roles como cedeas_supervisor:
   *  solo ven reportes de estas). null/ausente = sin restricción; [] = rol
   *  acotado sin sucursales asignadas (no ve nada). Ver lib/branch-scope.ts. */
  scopedBranchIds?: string[] | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  user: UserResponse;
}

export interface MessageResponse {
  message: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface AcceptInvitationData {
  token: string;
  newPassword: string;
}

/** Respuesta de accept-invitation: incluye el email para el auto-login. */
export interface AcceptInvitationResult {
  message: string;
  email: string;
}

export type InvitationStatus =
  | 'valid'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'invalid';

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

// Storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const REMEMBER_KEY = 'rememberMe';

class AuthService {
  /**
   * Token storage del ACCESS token según "Recordarme": localStorage con ON,
   * sessionStorage con OFF. El REFRESH token ya NO se guarda aquí: vive en
   * cookie httpOnly que pone el API (XSS no puede robarlo).
   *
   * Pestañas nuevas sin "Recordarme" (sessionStorage es por-pestaña): no ven
   * el access token, pero initializeAuth hace un refresh silencioso vía la
   * cookie httpOnly y restaura la sesión — sin compartir tokens por
   * localStorage.
   */
  private getStorage(): Storage {
    return this.isRemembered() ? localStorage : sessionStorage;
  }

  setRemember(remember: boolean): void {
    if (typeof window === 'undefined') return;
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, '1');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }

  /** True si el usuario marcó "Recordarme" (sesión persistente entre reinicios). */
  isRemembered(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REMEMBER_KEY) === '1';
  }

  /**
   * True si la cookie de sesión del middleware sigue presente. Cuando "Recordarme"
   * está apagado, esa cookie es de sesión y desaparece al cerrar el navegador;
   * su ausencia indica reinicio del navegador (≠ una pestaña nueva, donde sí está).
   */
  hasAuthCookie(): boolean {
    if (typeof window === 'undefined') return false;
    return document.cookie
      .split('; ')
      .some((c) => c.startsWith('accessToken=') && c.slice('accessToken='.length) !== '');
  }

  // Token management
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Check both storages — tokens may be in either
    return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string, user?: Pick<UserResponse, 'customerType'> | null): void {
    if (typeof window === 'undefined') return;
    const storage = this.getStorage();
    const other = storage === localStorage ? sessionStorage : localStorage;
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    // Evitar que una copia vieja en el otro storage sombree a la nueva.
    other.removeItem(ACCESS_TOKEN_KEY);

    // El refresh token SÍ se persiste en storage y se manda en el body de
    // /auth/refresh: el front (vercel) y el API (railway) son sitios distintos,
    // así que la cookie httpOnly de refresh es de tercero y los navegadores la
    // bloquean (incógnito / Chrome / Safari) -> el refresh fallaba y cerraba la
    // sesión cada 15 min. (La cookie sigue como respaldo si el navegador la deja.)
    if (refreshToken) {
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      other.removeItem(REFRESH_TOKEN_KEY);
    }

    // Routing cookies for the middleware (lifetime matches the storage mode). El tipo de
    // cuenta no viaja en el JWT: sale del usuario de la respuesta (la cuenta del público
    // se rutea a la tienda, no al panel del distribuidor).
    writeAuthCookies(accessToken, user?.customerType);
  }

  /** Guarda la sesión que devolvió el API (tokens, cookies de ruteo y usuario). */
  private saveSession(auth: AuthResponse): AuthResponse {
    this.setTokens(auth.accessToken, auth.refreshToken, auth.user);
    this.setStoredUser(auth.user);
    return auth;
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    // Clear from both storages
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    // Clear routing cookies
    clearAuthCookies();
  }

  getStoredUser(): UserResponse | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setStoredUser(user: UserResponse): void {
    if (typeof window === 'undefined') return;
    this.getStorage().setItem(USER_KEY, JSON.stringify(user));
  }

  // API calls
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { remember, ...loginData } = credentials;
    // Set storage strategy BEFORE saving tokens
    this.setRemember(remember ?? false);

    // rememberMe viaja al API: decide si la cookie httpOnly del refresh es
    // persistente (7d) o de sesión.
    const response = await api.post<LoginResult>('/auth/login', {
      ...loginData,
      rememberMe: remember ?? false,
    });

    // Si requiere vinculación de email, no guardar tokens
    if (isEmailLinkRequired(response.data)) {
      return response.data;
    }

    // Login normal: guardar tokens
    return this.saveSession(response.data as AuthResponse);
  }

  async linkEmail(data: LinkEmailData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/link-email', data);
    return response.data;
  }

  async verifyLinkEmail(data: VerifyLinkEmailData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-link-email', data);
    return this.saveSession(response.data);
  }

  // ---- Google Sign-In

  /** Si el servidor tiene Google Sign-In encendido y con qué client ID web. */
  async googleStatus(): Promise<GoogleAuthStatus> {
    const response = await api.get<GoogleAuthStatus>('/auth/google/status');
    return response.data;
  }

  /** Botón de Google: entra, o pide vincular (requiresAccountLink) sin guardar nada. */
  async loginWithGoogle(data: GoogleLoginData): Promise<GoogleLoginResult> {
    const { remember, idToken } = data;
    this.setRemember(remember ?? false);
    const response = await api.post<GoogleLoginResult>('/auth/google', {
      idToken,
      rememberMe: remember ?? false,
    });
    if (isGoogleLinkRequired(response.data)) {
      return response.data;
    }
    return this.saveSession(response.data);
  }

  /** Confirma con ID/correo/usuario + contraseña, vincula la cuenta de Google y entra. */
  async linkGoogle(data: GoogleLinkData): Promise<AuthResponse> {
    const { remember, ...body } = data;
    this.setRemember(remember ?? false);
    const response = await api.post<AuthResponse>('/auth/google/link', {
      ...body,
      rememberMe: remember ?? false,
    });
    return this.saveSession(response.data);
  }

  /**
   * Crea la cuenta del público con la cuenta de Google que la persona acaba de elegir
   * (`canSignUp`): correo ya verificado y sin contraseña. Deja la sesión iniciada.
   * `body` se arma con `buildGoogleSignupBody` (el API rechaza propiedades de más).
   */
  async signUpWithGoogle(body: GoogleSignupBody, options: SignupSessionOptions = {}): Promise<AuthResponse> {
    const remember = options.remember ?? false;
    this.setRemember(remember);
    const response = await api.post<AuthResponse>('/auth/google/signup', { ...body, rememberMe: remember });
    return this.saveSession(response.data);
  }

  /** Paso del correo del primer login: vincular Google en vez de teclear correo + código. */
  async linkEmailWithGoogle(data: LinkEmailGoogleData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/link-email/google', data);
    return this.saveSession(response.data);
  }

  /**
   * Formulario "Crea tu cuenta": crea la cuenta del público (cliente final) y deja la
   * sesión iniciada. `data` se arma con `buildRegisterBody`: el API no admite
   * `rememberMe` ni nada fuera de su DTO, así que "recordar" solo decide dónde se guardan
   * los tokens en este navegador.
   */
  async register(data: RegisterData, options: SignupSessionOptions = {}): Promise<AuthResponse> {
    if (options.remember !== undefined) this.setRemember(options.remember);
    const response = await api.post<AuthResponse>('/auth/register', data);
    return this.saveSession(response.data);
  }

  async logout(): Promise<void> {
    try {
      // El API toma el refresh de la cookie httpOnly y la limpia; se manda el
      // legacy del storage solo si quedó de una sesión previa al cambio.
      const legacyRefresh = this.getRefreshToken();
      await api.post(
        '/auth/logout',
        legacyRefresh ? { refreshToken: legacyRefresh } : {},
      );
    } catch {
      // Ignore errors on logout
    } finally {
      this.clearTokens();
    }
  }

  async logoutAllSessions(): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/logout-all');
    this.clearTokens();
    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    // Mandamos el refresh token del storage en el body (la cookie cross-site no
    // es confiable). Cae a la cookie solo si no hay nada en storage.
    const storedRefresh = this.getRefreshToken();
    const response = await api.post<AuthResponse>(
      '/auth/refresh',
      storedRefresh
        ? { refreshToken: storedRefresh, rememberMe: this.isRemembered() }
        : {},
    );
    return this.saveSession(response.data);
  }

  async getProfile(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/auth/profile');
    this.setStoredUser(response.data);
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/change-password', data);
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/forgot-password', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/reset-password', data);
    return response.data;
  }

  /** Definir contraseña desde una invitación (colaborador/distribuidor). */
  async acceptInvitation(
    data: AcceptInvitationData,
  ): Promise<AcceptInvitationResult> {
    const response = await api.post<AcceptInvitationResult>(
      '/auth/accept-invitation',
      data,
    );
    return response.data;
  }

  /**
   * Estado de una invitación SIN consumirla (read-only). Lo usa /set-password
   * al cargar para decidir qué mostrar (form, "cuenta ya activada", inválido).
   */
  async getInvitationStatus(token: string): Promise<{ status: InvitationStatus }> {
    const response = await api.get<{ status: InvitationStatus }>(
      '/auth/invitation-status',
      { params: { token } },
    );
    return response.data;
  }

  async verifyEmail(data: VerifyEmailData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/verify-email', data);
    return response.data;
  }

  async resendVerificationEmail(data: ResendVerificationData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/resend-verification-email', data);
    return response.data;
  }

  // Helper methods
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    // Superadmin has all permissions
    if (user.roles?.includes('super_admin')) return true;

    // Check exact match or wildcard
    const [module, action] = permission.split(':');
    return user.permissions.some((p) => {
      const [pModule, pAction] = p.split(':');
      if (pModule === '*' && pAction === '*') return true;
      if (pModule === module && pAction === '*') return true;
      return pModule === module && pAction === action;
    });
  }

  isEmailVerified(): boolean {
    const user = this.getStoredUser();
    return !!user?.emailVerifiedAt;
  }
}

export const authService = new AuthService();
export default authService;
