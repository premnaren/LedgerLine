export type Role = 'ADMIN' | 'HOLDER' | 'AUDITOR';

export interface UserSession {
  id: string;
  email: string;
  role: Role;
}

const STORAGE_KEY_USER = 'ledgerline_user';
const STORAGE_KEY_REFRESH_TOKEN = 'ledgerline_refresh_token';

// In-memory token storage
let inMemoryAccessToken: string | null = null;
let currentUser: UserSession | null = null;
const listeners = new Set<() => void>();
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  listeners.forEach((listener) => listener());
}

export function getUser(): UserSession | null {
  if (currentUser) return currentUser;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
      }
    } catch {
      // Ignore JSON parse errors on invalid storage
    }
  }
  return null;
}

export function setUser(user: UserSession | null) {
  currentUser = user;
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
    }
  }
  listeners.forEach((listener) => listener());
}

export function setSession(
  accessToken: string | null,
  user: UserSession | null,
  refreshToken?: string | null
) {
  setAccessToken(accessToken);
  setUser(user);
  if (typeof window !== 'undefined') {
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
    } else if (refreshToken === null) {
      localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
    }
  }
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh requests into a single in-flight promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const storedRefreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
          : null;

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(storedRefreshToken ? { refreshToken: storedRefreshToken } : {}),
      });

      if (!res.ok) {
        setAccessToken(null);
        setUser(null);
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        if (data.user) {
          setUser(data.user);
        }
        return data.accessToken;
      }
      return null;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logoutUser(): Promise<void> {
  try {
    const storedRefreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
        : null;

    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(storedRefreshToken ? { refreshToken: storedRefreshToken } : {}),
    });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    setAccessToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
      window.location.href = '/login';
    }
  }
}

