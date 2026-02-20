// Re-export from axios for backward compatibility
// This allows services to import from '@/lib/api-client'
import api from './axios';

export const apiClient = api;
export default api;
