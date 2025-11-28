import type { User } from '@/src/models/User';

// Storage keys used across the app
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  POSTS: 'posts:v1',
} as const;

// Runtime config & feature switches (can be overridden via EXPO_PUBLIC_* envs)
export const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() === 'true';
if (!USE_MOCK && !process.env.EXPO_PUBLIC_API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[config] USE_MOCK is false but EXPO_PUBLIC_API_URL is not set. Falling back to https://example.invalid');
}
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://example.invalid';
export const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS ?? 10000);

// API endpoints (path only). Base URL comes from src/config
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',    // POST
    REGISTER: '/api/v1/auth/register',  // POST
    ME: '/api/v1/auth/me',  // GET
    LOGOUT: '/api/v1/auth/logout',  //POST
    // REFRESH: '/api/v1/auth/refresh', // POST (Not in openapi.json)
  },
  USERS: {
    ROOT: '/api/v1/users', // GET /:userId, PUT /:userId
    POSTS: '/api/v1/users/:userId/posts',
    FAVORITES: '/api/v1/users/:userId/favorites',
    FOLLOWING: '/api/v1/users/:userId/following',
    FOLLOWERS: '/api/v1/users/:userId/followers',
    FOLLOW: '/api/v1/users/:userId/follow',
  },
  ADMIN: {
    POSTS_PENDING: '/api/v1/admin/posts/pending',
    POST_REVIEW: '/api/v1/admin/posts/:postId/review',
    POSTS: '/api/v1/admin/posts',
    POST_DELETE: '/api/v1/admin/posts/:postId',
    USERS: '/api/v1/admin/users',
    USER_ROLE: '/api/v1/admin/users/:userId/role',
    USER_STATUS: '/api/v1/admin/users/:userId/status',
    ADMINS: '/api/v1/admin/admins',
    SUPER_ADMINS: '/api/v1/admin/super-admins',
    COMMENTS: '/api/v1/admin/comments',
    COMMENT_DELETE: '/api/v1/admin/comments/:commentId',
  },
  POSTS: {
    GETPOSTPRE: '/api/v1/posts',  // GET
    GETPOSTALL: '/api/v1/posts/:postId',  // GET
    CREATEPOST: '/api/v1/posts',  // POST
    UPDATEPOST: '/api/v1/posts/:postId',  // PUT
    DELETEPOST: '/api/v1/posts/:postId',  // DELETE
    LIKEPOST: '/api/v1/posts/:postId/like',  // POST
    UNLIKEPOST: '/api/v1/posts/:postId/like',  // DELETE
    FAVORITEPOST: '/api/v1/posts/:postId/favorite',  // POST
    UNFAVORITEPOST: '/api/v1/posts/:postId/favorite',  // DELETE
    COMPANION_STATUS: '/api/v1/posts/:postId/companion-status', // PUT
  },
  COMMENTS: {
    LIST_FOR_POST: '/api/v1/posts/:postId/comments',
    LIST_REPLIES: '/api/v1/comments/:commentId/replies',
    CREATE: '/api/v1/posts/:postId/comments',
    LIKE: '/api/v1/comments/:commentId/like',
    UNLIKE: '/api/v1/comments/:commentId/like',
    DELETE: '/api/v1/comments/:commentId',
  },
  /*
  CONFIG: {
    CANTEENS: '/api/v1/config/canteens',
    CUISINES: '/api/v1/config/cuisines',
    FLAVORS: '/api/v1/config/flavors',
    POST_TYPES: '/api/v1/config/post-types',
  },
  UPLOAD: {
    IMAGE: '/api/v1/upload/image',
    IMAGES: '/api/v1/upload/images',
  },
  SEARCH: {
    POSTS: '/api/v1/search/posts',
    USERS: '/api/v1/search/users',
  },
  STATS: {
    PLATFORM: '/api/v1/stats/platform',
    USER: '/api/v1/stats/user/:userId',
  },
  */
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
  // email: simple email validation
  EMAIL: /.+@.+\..+/,
  // username: 3-30 chars, letters, numbers, underscore, dot, hyphen
  USERNAME: /^[a-zA-Z0-9_.-]{3,30}$/,
} as const;

// Convenience type to align with domain type if needed
export type Role = User['role'];

