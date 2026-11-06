export type Role = 'ADMIN' | 'HOLDER' | 'AUDITOR';

export interface UserSession {
  id: string;
  email: string;
  role: Role;
}

// In-memory token storage (NEVER in localStorage as per security constraints)
let inMemoryAccessToken: string | null = null;
let currentUser: UserSession | null = null;
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  listeners.forEach((listener) => listener());
}

export function getUser(): UserSession | null {
  return currentUser;
}

export function setUser(user: UserSession | null) {
  currentUser = user;
  listeners.forEach((listener) => listener());
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!res.ok) {
      setAccessToken(null);
      setUser(null);
      return null;
    }

    const data = await res.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch (error) {
    setAccessToken(null);
    setUser(null);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    setAccessToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

