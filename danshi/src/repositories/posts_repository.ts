import type { PostInput as ApiPostInput, Post as ApiPost } from '@/src/api/posts';
import * as postsApi from '@/src/api/posts';

export type PostInput = ApiPostInput;
export type Post = ApiPost;

export interface PostsRepository {
  create(input: PostInput): Promise<Post>;
}

export class ApiPostsRepository implements PostsRepository {
  async create(input: PostInput): Promise<Post> {
    // 目前委托给现有 api 层
    return postsApi.createPost({
      title: input.title.trim(),
      content: input.content.trim(),
    });
  }
}

export const postsRepository: PostsRepository = new ApiPostsRepository();
