/**
 * Unified API Client for communicating with the ASALISWAD Express Backend API
 */

const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://localhost:5000';
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const baseUrl = getBackendUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || result.message || `HTTP Error ${response.status}` };
    }

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network request failed' };
  }
};
