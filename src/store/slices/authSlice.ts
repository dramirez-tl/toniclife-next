import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  authService,
  UserResponse,
  LoginCredentials,
  LoginResult,
  EmailLinkRequired,
  isEmailLinkRequired,
  RegisterData,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/services/auth.service';
import { AxiosError } from 'axios';

// Types
export interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  emailLinkRequired: EmailLinkRequired | null;
}

interface ApiError {
  message: string;
  statusCode?: number;
}

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    // Handle 401 — use backend message when available
    if (error.response?.status === 401) {
      const msg = error.response?.data?.message;
      if (msg && msg !== 'Unauthorized') return msg;
      return 'Credenciales incorrectas. Verifica tu email y contraseña.';
    }
    // Handle other common errors
    if (error.response?.status === 429) {
      return 'Demasiados intentos. Espera un momento antes de intentar de nuevo.';
    }
    if (error.response?.status === 500) {
      return 'Error del servidor. Intenta de nuevo más tarde.';
    }
    return error.response?.data?.message || error.message || 'Error de conexión';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
};

// SessionStorage key for emailLinkRequired (survives full-page navigations)
const EMAIL_LINK_KEY = 'emailLinkRequired';

const getStoredEmailLink = (): EmailLinkRequired | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(EMAIL_LINK_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  emailLinkRequired: null,
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const storedUser = authService.getStoredUser();
      const token = authService.getAccessToken();

      if (!token || !storedUser) {
        return null;
      }

      // Return stored user immediately for fast UI render
      // Token validation happens via API interceptors on actual requests
      return storedUser;
    } catch (error) {
      // Token is invalid, clear storage
      authService.clearTokens();
      return null;
    }
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      return null;
    } catch (error) {
      // Still clear local state even if API call fails
      authService.clearTokens();
      return null;
    }
  }
);

export const logoutAllSessionsAsync = createAsyncThunk(
  'auth/logoutAll',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logoutAllSessions();
      return null;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const refreshProfileAsync = createAsyncThunk(
  'auth/refreshProfile',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getProfile();
      return user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const changePasswordAsync = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordData, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(data);
      return response.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const forgotPasswordAsync = createAsyncThunk(
  'auth/forgotPassword',
  async (data: ForgotPasswordData, { rejectWithValue }) => {
    try {
      const response = await authService.forgotPassword(data);
      return response.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const resetPasswordAsync = createAsyncThunk(
  'auth/resetPassword',
  async (data: ResetPasswordData, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(data);
      return response.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifyEmailAsync = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail({ token });
      return response.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const resendVerificationAsync = createAsyncThunk(
  'auth/resendVerification',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authService.resendVerificationEmail({ email });
      return response.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    clearEmailLinkRequired: (state) => {
      state.emailLinkRequired = null;
      try { sessionStorage.removeItem(EMAIL_LINK_KEY); } catch {}
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.emailLinkRequired = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;

        if (isEmailLinkRequired(action.payload)) {
          // Usuario migrado necesita vincular email
          state.emailLinkRequired = action.payload;
          state.isAuthenticated = false;
          state.user = null;
          // Persist so it survives full-page navigation
          try { sessionStorage.setItem(EMAIL_LINK_KEY, JSON.stringify(action.payload)); } catch {}
        } else {
          // Login normal exitoso
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.emailLinkRequired = null;
          try { sessionStorage.removeItem(EMAIL_LINK_KEY); } catch {}
        }
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Logout all sessions
      .addCase(logoutAllSessionsAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Refresh profile
      .addCase(refreshProfileAsync.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      // Change password (logs out all sessions)
      .addCase(changePasswordAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Forgot password
      .addCase(forgotPasswordAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPasswordAsync.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(forgotPasswordAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Reset password
      .addCase(resetPasswordAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPasswordAsync.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Verify email
      .addCase(verifyEmailAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmailAsync.fulfilled, (state) => {
        state.isLoading = false;
        if (state.user) {
          state.user.emailVerifiedAt = new Date().toISOString();
        }
      })
      .addCase(verifyEmailAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, clearUser, setError, clearError, setInitialized, clearEmailLinkRequired } = authSlice.actions;
export default authSlice.reducer;

// Empty arrays for stable references (prevents re-renders)
const EMPTY_ROLES: string[] = [];
const EMPTY_PERMISSIONS: string[] = [];

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectUserRoles = (state: { auth: AuthState }): string[] => {
  return state.auth.user?.roles ?? EMPTY_ROLES;
};
export const selectUserPermissions = (state: { auth: AuthState }) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS;
export const selectIsEmailVerified = (state: { auth: AuthState }) => !!state.auth.user?.emailVerifiedAt;
export const selectEmailLinkRequired = (state: { auth: AuthState }) => state.auth.emailLinkRequired;
