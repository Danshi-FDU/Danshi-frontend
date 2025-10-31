import { usersRepository, type UpdateUserInput, type UserProfile } from '@/src/repositories/users_repository';
import { AppError } from '@/src/lib/errors/app_error';
import { USE_MOCK } from '@/src/constants/app';

const isNonEmpty = (v?: string | null) => !!v && v.trim().length > 0;
// 头像 URL 校验：
// - Mock ：允许 http(s) 以及本地预览 blob:/data:/file:
// - 接口模式：仅允许 http(s)
const isValidUrl = (v?: string | null) => {
  if (!v) return true;
  if (USE_MOCK) return /^(https?:|blob:|data:|file:)/i.test(v);
  return /^https?:\/\//i.test(v);
};

export const usersService = {
  async getUser(userId: string): Promise<UserProfile> {
    if (!isNonEmpty(userId)) throw new AppError('缺少用户ID');
    return usersRepository.getUser(userId);
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<UserProfile> {
    if (!isNonEmpty(userId)) throw new AppError('缺少用户ID');
    if (input.name !== undefined && !isNonEmpty(input.name)) throw new AppError('用户名不能为空');
    if (input.avatarUrl !== undefined && !isValidUrl(input.avatarUrl)) {
      if (USE_MOCK) throw new AppError('头像URL不合法');
      throw new AppError('头像URL必须为 http(s) 地址，或实现上传后使用服务器返回的地址');
    }
    const { user } = await usersRepository.updateUser(userId, input);
    return user;
  },
};
