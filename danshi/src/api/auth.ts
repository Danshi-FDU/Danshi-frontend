import type { User } from '@/src/models/User';
import { AuthStorage } from '@/src/lib/auth/auth_storage';
import config from '@/src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegisterPayload = { username: string; email: string; password: string };
export type LoginPayload = { identifier: string; password: string }; // identifier can be email or username

const BASE_URL = config.apiBaseUrl;
const USERS_KEY = 'mock:users:v1';

type StoredUser = User & { username?: string; password: string };

async function loadUsers(): Promise<StoredUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function register(payload: RegisterPayload): Promise<{ token: string; user: User }> {
  // In real world, call API: POST /auth/register
  await new Promise((r) => setTimeout(r, 400));
  const users = await loadUsers();
  const emailLower = payload.email.trim().toLowerCase();
  const usernameLower = payload.username.trim().toLowerCase();
  if (users.some(u => u.email.toLowerCase() === emailLower)) {
    throw new Error('邮箱已被注册');
  }
  if (users.some(u => (u.name ?? '').toLowerCase() === usernameLower)) {
    throw new Error('用户名已被占用');
  }
  const user: StoredUser = {
    id: `${Date.now()}`,
    email: payload.email.trim(),
    name: payload.username.trim(),
    role: 'user',
    avatarUrl: null,
    password: payload.password,
  };
  users.push(user);
  await saveUsers(users);
  const token = `mock-token-${user.id}`;
  await AuthStorage.setToken(token);
  return { token, user };
}

export async function login(payload: LoginPayload): Promise<{ token: string; user: User }> {
  // In real world, call API: POST /auth/login
  await new Promise((r) => setTimeout(r, 300));
  const users = await loadUsers();
  const idf = payload.identifier.trim().toLowerCase();
  const user = users.find(
    (u) => u.email.toLowerCase() === idf || (u.name ?? '').toLowerCase() === idf
  );
  if (!user || user.password !== payload.password) {
    throw new Error('账号或密码错误');
  }
  const token = `mock-token-${user.id}`;
  await AuthStorage.setToken(token);
  return { token, user };
}

export async function logout(): Promise<void> {
  await AuthStorage.clearToken();
}

export async function getProfile(): Promise<User> {
  const token = await AuthStorage.getToken();
  if (!token) throw new Error('Unauthorized');
  // const res = await fetch(`${BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
  // if (!res.ok) throw new Error('Failed to fetch profile');
  // return res.json();
  return { id: '1', email: 'demo@example.com', name: 'Demo User', role: 'user', avatarUrl: null } as User;
}

export async function refreshToken(): Promise<string> {
  const token = await AuthStorage.getToken();
  if (!token) throw new Error('No token');
  // const res = await fetch(`${BASE_URL}/refresh`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  // if (!res.ok) throw new Error('Failed to refresh token');
  // const data = await res.json();
  const newToken = token; // mock same
  await AuthStorage.setToken(newToken);
  return newToken;
}
