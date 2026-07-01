const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'bidcapture_access_token';
export const AUTH_EXPIRES_AT_KEY = 'bidcapture_token_expires_at';
export const AUTH_USER_KEY = 'bidcapture_user';
export const AUTH_CHANGED_EVENT = 'bidcapture-auth-changed';

export function apiUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  return path;
}

export function getStoredToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): string | null {
  return window.localStorage.getItem(AUTH_USER_KEY);
}

export function saveStoredToken(token: string, expiresIn: number, username: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
  window.localStorage.setItem(AUTH_USER_KEY, username);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function hasValidStoredToken(): boolean {
  const token = getStoredToken();
  const expiresAt = Number(window.localStorage.getItem(AUTH_EXPIRES_AT_KEY) || 0);
  if (!token || !expiresAt || expiresAt <= Date.now()) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    return false;
  }
  return true;
}

export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredToken();
    }

    const payloadRecord = typeof payload === 'object' && payload !== null
      ? payload as Record<string, unknown>
      : {};
    const message = typeof payload === 'string'
      ? payload
      : String(payloadRecord.detail || payloadRecord.message || `请求失败：${response.status}`);
    throw new Error(message);
  }

  return payload as T;
}
