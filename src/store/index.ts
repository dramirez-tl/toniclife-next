// Store exports
export { store } from './store';
export type { RootState, AppDispatch } from './store';

// Hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Auth slice
export {
  setUser,
  clearUser,
  setError,
  clearError,
  setInitialized,
  initializeAuth,
  loginAsync,
  registerAsync,
  logoutAsync,
  logoutAllSessionsAsync,
  refreshProfileAsync,
  changePasswordAsync,
  forgotPasswordAsync,
  resetPasswordAsync,
  verifyEmailAsync,
  resendVerificationAsync,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsInitialized,
  selectAuthError,
  selectUserRoles,
  selectUserPermissions,
  selectIsEmailVerified,
} from './slices/authSlice';
export type { AuthState } from './slices/authSlice';

// UI slice
export {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  openModal,
  closeModal,
} from './slices/uiSlice';
export type { UIState, Notification } from './slices/uiSlice';
