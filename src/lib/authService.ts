import { jwtDecode } from 'jwt-decode';

const API_URL = '';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  userId?: number;
  error?: string;
}

export interface UserNote {
  note_key: string;
  note_title: string | null;
  created_at: number;
  expiry_time: number | null;
}

const TOKEN_KEY = 'secure_pad_auth_token';

// ─── Authentication ───────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<AuthUser & { exp: number }>(token);
    if (decoded.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }
    return { id: decoded.id, username: decoded.username };
  } catch {
    return null;
  }
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  const res = await fetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');
  if (data.token) setToken(data.token);
  return data.user!;
}

export async function register(username: string, email: string, password: string): Promise<void> {
  const res = await fetch(`/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Registration failed');
}

export function logout() {
  removeToken();
}

// ─── User Notes (dashboard) ───────────────────────────────────────────────────

export async function getUserNotes(): Promise<UserNote[]> {
  const res = await fetch(`/api/user/notes`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load your pads');
  const data = await res.json();
  return data.notes || [];
}

export async function deleteUserNote(noteKey: string): Promise<void> {
  const res = await fetch(`/api/user/notes/${noteKey}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete pad');
}
