import api from '@/lib/axios';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
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
    // Also set in cookie for middleware access
    document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Also clear cookie
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
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
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/v1/auth/login', credentials);
    this.setTokens(response.data.accessToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/v1/auth/register', data);
    this.setTokens(response.data.accessToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      await api.post('/v1/auth/logout', { refreshToken });
    } catch {
      // Ignore errors on logout
    } finally {
      this.clearTokens();
    }
  }

  async logoutAllSessions(): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/logout-all');
    this.clearTokens();
    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    const response = await api.post<AuthResponse>('/v1/auth/refresh', { refreshToken });
    this.setTokens(response.data.accessToken);
    this.setStoredUser(response.data.user);
    return response.data;
  }

  async getProfile(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/v1/auth/profile');
    this.setStoredUser(response.data);
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/change-password', data);
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/forgot-password', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/reset-password', data);
    return response.data;
  }

  async verifyEmail(data: VerifyEmailData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/verify-email', data);
    return response.data;
  }

  async resendVerificationEmail(data: ResendVerificationData): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/v1/auth/resend-verification-email', data);
    return response.data;
  }

  // Helper methods
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.roles.includes(role) ?? false;
  }

  hasPermission(permission: string): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    // Superadmin has all permissions
    if (user.roles.includes('superadmin')) return true;

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
