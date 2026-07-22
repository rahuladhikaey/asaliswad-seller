/**
 * Production-Ready API Client for ASALISWAD Marketplace Frontends
 * Interconnects Frontends with Express Backend API (https://api.asaliswad.com)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.asaliswad.com';

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success?: boolean;
}

const getStoredToken = (type: 'access' | 'refresh'): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`asaliswad_${type}_token`);
};

const setStoredToken = (type: 'access' | 'refresh', token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`asaliswad_${type}_token`, token);
  }
};

/**
 * Automatic Token Refresh Flow
 */
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = getStoredToken('refresh');
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.accessToken) {
      setStoredToken('access', data.accessToken);
      if (data.refreshToken) setStoredToken('refresh', data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Core Request Execution with Interceptors, Retry, and Timeout
 */
export const apiFetch = async <T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> => {
  const { timeoutMs = 15000, retries = 2, ...fetchOptions } = options;
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 1. Request Interceptor: Inject JWT Token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
      };

      const token = getStoredToken('access');
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 2. Token Refresh Interceptor on 401
      if (response.status === 401 && attempt === 0) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          attempt++;
          continue; // Retry with new token
        }
      }

      const result = await response.json().catch(() => ({}));

      // 3. Response Interceptor & Centralized Error Handling
      if (!response.ok) {
        return {
          data: null,
          error: result.error || result.message || `HTTP ${response.status} Error`,
          success: false,
        };
      }

      return {
        data: result.data !== undefined ? result.data : result,
        error: null,
        success: true,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMessage = isAbort ? 'Request Timeout (15s)' : err.message || 'Network error';

      if (attempt < retries && !isAbort) {
        attempt++;
        await new Promise((res) => setTimeout(res, 1000 * attempt)); // Exponential backoff
        continue;
      }

      return { data: null, error: errorMessage, success: false };
    }
  }

  return { data: null, error: 'Request failed after maximum retries', success: false };
};
