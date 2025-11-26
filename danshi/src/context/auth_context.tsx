import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@/src/models/User';
import { AuthStorage } from '@/src/lib/auth/auth_storage';
import { authService } from '@/src/services/auth_service';
import { decodeJwtPayload } from '../lib/auth/jwt';

export type AuthContextValue = {
  userToken: string | null;
  user: User | null; // full info（from /auth/me）
  preview: Pick<User, 'name' | 'avatar_url'> | null; // from JWT payload 
  isLoading: boolean;
  signIn: (token: string) => Promise<void>; 
  signOut: () => Promise<void>;
  refreshUser: (tokenOverride?: string) => Promise<void>; // refresh /me
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [preview, setPreview] = useState<Pick<User, 'name' | 'avatar_url'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // from token get name and avtarUrl
  const computePreview = (token: string | null): Pick<User, 'name' | 'avatar_url'> | null => {
    if (!token) return null;
    const payload = decodeJwtPayload<Record<string, any>>(token);
    if (!payload || typeof payload !== 'object') return null;
    const name = (payload.nickname ?? payload.name ?? null) as string | null;
    const avatarUrl = (payload.avatarUrl ?? payload.avatar ?? null) as string | null;
    if (!name && !avatarUrl) return null;
    return { name: name ?? '', avatar_url: avatarUrl ?? null };
  };

  const restore = async () => {
    try {
      const token = await AuthStorage.getToken();
      setUserToken(token ?? null);
      setPreview(computePreview(token ?? null));
      if (token) {
        // get full user info silently
        try {
          const me = await authService.me();
          setUser(me);
        } catch {
          await AuthStorage.clearToken();
          setUserToken(null);
          setPreview(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = async (tokenOverride?: string) => {
    const token = tokenOverride ?? userToken ?? (await AuthStorage.getToken());
    if (!token) return;
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      await AuthStorage.clearToken();
      setUserToken(null);
      setPreview(null);
    }
  };

  const signIn = async (token: string) => {
    setIsLoading(true);
    try {
      await AuthStorage.setToken(token);
      setUserToken(token);
      setPreview(computePreview(token)); 
      setUser(null);
      await refreshUser(token);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // Call API to logout (best-effort), then clear local state
      await authService.logout();
      setUserToken(null);
      setUser(null);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    userToken,
    user,
    preview,
    isLoading,
    signIn,
    signOut,
    refreshUser,
  }), [userToken, user, preview, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
