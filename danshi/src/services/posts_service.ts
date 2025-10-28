import { postsRepository, type PostInput, type Post } from '@/src/repositories/posts_repository';
import { AppError } from '@/src/lib/errors/app_error';

function validate(input: PostInput) {
  const title = input.title?.trim() ?? '';
  const content = input.content?.trim() ?? '';
  if (!title) throw new AppError('请输入标题');
  if (title.length < 2) throw new AppError('标题至少 2 个字');
  if (!content) throw new AppError('请输入正文内容');
  if (content.length < 5) throw new AppError('正文至少 5 个字');
}

export const postsService = {
  async create(input: PostInput): Promise<Post> {
    validate(input);
    return postsRepository.create({
      title: input.title.trim(),
      content: input.content.trim(),
    });
  },
};
