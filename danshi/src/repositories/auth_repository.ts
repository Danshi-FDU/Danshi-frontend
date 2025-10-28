import { http } from '@/src/lib/http/client';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { User } from '@/src/models/User';
import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';

export type LoginInput = { email: string; password: string };
export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
  gender?: 'male' | 'female';
  hometown?: string;
  avatarUrl?: string | null;
};

export type AuthPayload = { token: string; user: User };

export interface AuthRepository {
  login(input: LoginInput): Promise<AuthPayload>;
  register(input: RegisterInput): Promise<AuthPayload>;
  me(): Promise<{ user: User }>;
  logout(): Promise<void>;
}

export class ApiAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<AuthPayload> {
    const res = await http.post<ApiResponse<AuthPayload>>(API_ENDPOINTS.AUTH.LOGIN, input);
    return unwrapApiResponse<AuthPayload>(res);
  }
  async register(input: RegisterInput): Promise<AuthPayload> {
    const res = await http.post<ApiResponse<AuthPayload>>(API_ENDPOINTS.AUTH.REGISTER, input);
    return unwrapApiResponse<AuthPayload>(res);
  }
  async me(): Promise<{ user: User }> {
    const res = await httpAuth.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.AUTH.ME);
    return unwrapApiResponse<{ user: User }>(res);
  }
  async logout(): Promise<void> {
    try {
      await httpAuth.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // ignore
    }
  }
}
// Mock
export class MockAuthRepository implements AuthRepository {
  private mockUser: User = {
    id: '1234567890',
    email: 'knd@example.com',
    name: 'knd',
    gender: 'male',
    hometown: 'Shanghai',
    role: 'user',
    avatarUrl: null,
  };

  async login(input: LoginInput): Promise<AuthPayload> {
    await new Promise((r) => setTimeout(r, 400));
    if (!input.email || !input.password) {
      throw new Error('邮箱或密码错误');
    }
    return { token: 'mock-token', user: this.mockUser };
  }
  async register(input: RegisterInput): Promise<AuthPayload> {
    await new Promise((r) => setTimeout(r, 500));
    return { token: 'mock-token', user: { ...this.mockUser, email: input.email, name: input.name ?? '新用户' } };
  }
  async me(): Promise<{ user: User }> {
    await new Promise((r) => setTimeout(r, 200));
    return { user: this.mockUser };
  }
  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
  }
}

export const authRepository: AuthRepository = USE_MOCK ? new MockAuthRepository() : new ApiAuthRepository();
