// Store exports
export { store } from './store';
export type { RootState, AppDispatch } from './store';

// Hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Auth slice
export {
  setCredentials,
  clearCredentials,
  updateUser,
  setError,
  clearError,
  loginAsync,
  logoutAsync,
  refreshTokenAsync,
} from './slices/authSlice';
export type { User, AuthState } from './slices/authSlice';

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
