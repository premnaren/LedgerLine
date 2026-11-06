import { getAccessToken, refreshAccessToken, setAccessToken, setUser } from './auth';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let token = getAccessToken();

  // If no token in memory, attempt refresh via httpOnly cookie
  if (!token && typeof window !== 'undefined') {
    token = await refreshAccessToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 with automatic silent refresh retry once
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      setAccessToken(null);
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return res;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchWithAuth(endpoint, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: 'GET', headers }),
  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),
};

export default api;
