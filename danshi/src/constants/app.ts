import type { User } from '@/src/models/User';

// Storage keys used across the app
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  POSTS: 'posts:v1',
} as const;

// Runtime config & feature switches (can be overridden via EXPO_PUBLIC_* envs)
export const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() === 'true';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://example.invalid/api';
export const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS ?? 10000);

// API endpoints (path only). Base URL comes from src/config
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',    // POST
    REGISTER: '/api/v1/auth/register',  // POST
    ME: '/api/v1/auth/me',  // GET
    LOGOUT: '/api/v1/auth/logout',  //POST
  },
} as const;

// Role literals and their order (low -> high privilege)
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type RoleLiteral = typeof ROLES[keyof typeof ROLES];
export const ROLE_ORDER: RoleLiteral[] = [ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

// Common regex patterns
export const REGEX = {
  EMAIL: /.+@.+\..+/,
} as const;

// Convenience type to align with domain type if needed
export type Role = User['role'];
