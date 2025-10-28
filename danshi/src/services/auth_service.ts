import { authRepository, type LoginInput, type RegisterInput } from '@/src/repositories/auth_repository';
import { AuthStorage } from '@/src/lib/auth/auth_storage';
import type { User } from '@/src/models/User';
import { AppError } from '@/src/lib/errors/app_error';
import { REGEX } from '@/src/constants/app';

export type AuthState = { token: string; user: User };

function validateEmail(email: string) {
  return REGEX.EMAIL.test(email);
}

export const authService = {
  async login(input: LoginInput): Promise<AuthState> {
    if (!input.email || !validateEmail(input.email)) throw new AppError('邮箱格式不正确');
    if (!input.password || input.password.length < 6) throw new AppError('密码长度需 >= 6');
    const { token, user } = await authRepository.login(input);
    await AuthStorage.setToken(token);
    return { token, user };
  },

  async register(input: RegisterInput): Promise<AuthState> {
    if (!input.email || !validateEmail(input.email)) throw new AppError('邮箱格式不正确');
    if (!input.password || input.password.length < 8 || input.password.length > 64) throw new AppError('密码长度需 8-64');
    const { token, user } = await authRepository.register(input);
    await AuthStorage.setToken(token);
    return { token, user };
  },

  async me(): Promise<User> {
    const { user } = await authRepository.me();
    return user;
  },

  async logout(): Promise<void> {
    await authRepository.logout();
    await AuthStorage.clearToken();
  },
};
