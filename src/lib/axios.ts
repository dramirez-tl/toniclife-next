import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { writeAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const REMEMBER_KEY = 'rememberMe';

/** Read from whichever storage holds the value (localStorage first). */
const getToken = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key) || sessionStorage.getItem(key);
};

/**
 * Persist a token según "Recordarme": localStorage (persiste) con ON,
 * sessionStorage (muere con la pestaña) con OFF. Se borra SIEMPRE la copia
 * del otro storage para que un token viejo no "sombree" al nuevo (eso causaba
 * el bucle de refresh que motivó el localStorage-siempre anterior).
 *
 * Se usa tanto para el access como para el REFRESH token: el front y el API
 * están en sitios distintos, así que la cookie httpOnly de refresh es de tercero
 * y los navegadores la bloquean; por eso el refresh va en storage + body.
 */
const setToken = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  const remembered = localStorage.getItem(REMEMBER_KEY) === '1';
  const target = remembered ? localStorage : sessionStorage;
  const other = remembered ? sessionStorage : localStorage;
  target.setItem(key, value);
  other.removeItem(key);
};

/** Flag cookie (no httpOnly) que indica sesión activa para el middleware. */
const hasSessionCookie = (): boolean =>
  typeof document !== 'undefined' &&
  document.cookie.split('; ').some((c) => c.startsWith('accessToken=1'));

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

// Auth endpoints that should NOT trigger token refresh on 401
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/refresh',
  '/auth/link-email',
  '/auth/verify-link-email',
];

// Public endpoints that should NOT redirect to login on 401
const PUBLIC_ENDPOINTS = [
  '/cart',
  '/checkout',
  '/products',
  '/categories',
  '/quiz',
  '/shared-carts',
];

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Don't try to refresh token for auth endpoints - just pass through the error
    if (isAuthEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    // Endpoints "públicos" (catálogo, carrito, etc.): para invitados (sin sesión)
    // o errores que no son 401, propagar sin refrescar ni redirigir a login.
    // PERO si hay sesión activa y es 401, dejar pasar al flujo de refresh de abajo:
    // las sub-rutas admin bajo /products (precios, imágenes, documentos, cambios
    // de precio programados) necesitan renovar el token igual que el resto.
    if (isPublicEndpoint(originalRequest?.url)) {
      const hasSession = !!getToken(ACCESS_TOKEN_KEY) || hasSessionCookie();
      if (!hasSession || error.response?.status !== 401) {
        return Promise.reject(error);
      }
    }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // El refresh token vive en cookie httpOnly (withCredentials la manda).
        // Migración: si quedó un refresh viejo en storage (sesiones previas al
        // cambio), se manda por body UNA vez — el API responde seteando la
        // cookie — y se borra del storage para siempre.
        const storedRefresh = getToken(REFRESH_TOKEN_KEY);
        const remembered =
          typeof window !== 'undefined' &&
          localStorage.getItem(REMEMBER_KEY) === '1';

        const response = await api.post(
          '/auth/refresh',
          storedRefresh
            ? { refreshToken: storedRefresh, rememberMe: remembered }
            : {},
        );
        const { accessToken, refreshToken: newRefresh } = response.data;

        if (typeof window !== 'undefined') {
          setToken(ACCESS_TOKEN_KEY, accessToken);
          // Persistir el refresh token (la cookie cross-site no es confiable).
          // No rota, pero re-guardarlo mantiene la sesión viva sin depender de
          // cookies de tercero (incógnito / Chrome / Safari).
          if (newRefresh) setToken(REFRESH_TOKEN_KEY, newRefresh);
          // Renew routing cookies (lifetime matches the storage mode + the new role)
          writeAuthCookies(accessToken);
          // Persistir también el user actualizado del refresh: así una sesión
          // iniciada ANTES de que el API incluyera roleCategory converge sola
          // (el AuthGuard lee el user de storage; sin esto, cookie y user
          // podían discrepar hasta un logout manual).
          if (response.data.user) {
            setToken('user', JSON.stringify(response.data.user));
          }
        }

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Clear tokens (including cookie used by middleware) and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem('user');
          localStorage.removeItem(REMEMBER_KEY);
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          sessionStorage.removeItem(REFRESH_TOKEN_KEY);
          sessionStorage.removeItem('user');
          clearAuthCookies();

          // Tienda pública (carrito/checkout/catálogo): NO expulsar a /login a
          // mitad de compra — se degrada a invitado (los tokens ya quedaron
          // limpios y el carrito sigue vía x-session-id). El redirect a login
          // se reserva para las áreas autenticadas (panel/admin).
          const isPublic = isPublicEndpoint(originalRequest?.url);
          if (!isPublic && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
