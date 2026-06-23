import api from '@/lib/axios';
import { writeAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';

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

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  roles: string[];
  permissions: string[];
  customerId?: string;
  countryCode?: string;
  currencyCode?: string;
  defaultBranchId?: string;
  defaultBranchName?: string;
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

  setTokens(accessToken: string, refreshToken?: string): void {
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

    // Routing cookies for the middleware (lifetime matches the storage mode).
    writeAuthCookies(accessToken);
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
    const authResponse = response.data as AuthResponse;
    this.setTokens(authResponse.accessToken, authResponse.refreshToken);
    this.setStoredUser(authResponse.user);
    return authResponse;
  }

  async linkEmail(data: LinkEmailData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/link-email', data);
    return response.data;
  }

  async verifyLinkEmail(data: VerifyLinkEmailData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-link-email', data);
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setStoredUser(response.data.user);
    return response.data;
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
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setStoredUser(response.data.user);
    return response.data;
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
  async acceptInvitation(data: AcceptInvitationData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/accept-invitation', data);
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
