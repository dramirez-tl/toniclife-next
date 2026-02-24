import api from '@/lib/axios';

// Types
export interface LoginCredentials {
  identifier: string;
  password: string;
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
}

export interface AuthResponse {
  accessToken: string;
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
// Small cookie the middleware reads for auth/role routing (the full JWT is too
// large for a cookie when it embeds 100+ permissions).
const AUTH_COOKIE = 'accessToken';
const ROLE_COOKIE = 'authRole';

class AuthService {
  // Token management
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    // Set a tiny "logged-in" flag cookie so the middleware knows the user is
    // authenticated.  We intentionally do NOT store the full JWT here because
    // tokens with many permissions can exceed the 4 KB cookie limit and the
    // browser silently drops them.
    document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    // Store the role in a separate small cookie for middleware routing
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const role: string = Array.isArray(payload.roles) ? payload.roles[0] : (payload.role || '');
      document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    } catch {
      // If decoding fails, just set the flag – middleware will allow through
    }

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Clear cookies
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  }

  getStoredUser(): UserResponse | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setStoredUser(user: UserResponse): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // API calls
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const response = await api.post<LoginResult>('/auth/login', credentials);

    // Si requiere vinculación de email, no guardar tokens
    if (isEmailLinkRequired(response.data)) {
      return response.data;
    }

    // Login normal: guardar tokens
    const authResponse = response.data as AuthResponse;
    this.setTokens(authResponse.accessToken);
    this.setStoredUser(authResponse.user);
    return authResponse;
  }

  async linkEmail(data: LinkEmailData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/link-email', data);
    return response.data;
  }

  async verifyLinkEmail(data: VerifyLinkEmailData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-link-email', data);
    this.setTokens(response.data.accessToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    this.setTokens(response.data.accessToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
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
    const refreshToken = this.getRefreshToken();
    const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
    this.setTokens(response.data.accessToken);
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
