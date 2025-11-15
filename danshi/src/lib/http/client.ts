import config from '@/src/config';
import { AppError } from '@/src/lib/errors/app_error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpOptions = {
  baseUrl?: string;
  getAuthToken?: () => string | undefined | Promise<string | undefined>;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
};

export interface HttpClient {
  request<T = any>(method: HttpMethod, path: string, body?: any, init?: RequestInit): Promise<T>;
  get<T = any>(path: string, init?: RequestInit): Promise<T>;
  post<T = any>(path: string, body?: any, init?: RequestInit): Promise<T>;
  put<T = any>(path: string, body?: any, init?: RequestInit): Promise<T>;
  patch<T = any>(path: string, body?: any, init?: RequestInit): Promise<T>;
  delete<T = any>(path: string, init?: RequestInit): Promise<T>;
}

export function createHttpClient(opts: HttpOptions = {}): HttpClient {
  const baseUrl = opts.baseUrl ?? config.apiBaseUrl;
  const timeoutMs = opts.timeoutMs ?? config.requestTimeoutMs;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(opts.defaultHeaders ?? {}),
  } as Record<string, string>;

  async function request<T>(method: HttpMethod, path: string, body?: any, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const token = await opts.getAuthToken?.();
      const headers: Record<string, string> = { ...defaultHeaders, ...(init?.headers as any) };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...init,
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

      if (!res.ok) {
        const message = (data as any)?.message || `请求失败(${res.status})`;
        throw new AppError(message, { status: res.status, cause: data });
      }

      return (data as unknown) as T;
    } catch (e: any) {
      const name = (e && typeof e === 'object') ? (e as any).name : undefined;
      if (name === 'AbortError') {
        throw new AppError('请求超时', { code: 'TIMEOUT', cause: e });
      }
      throw AppError.from(e);
    } finally {
      clearTimeout(id);
    }
  }

  return {
    request,
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    put: (path, body, init) => request('PUT', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
    delete: (path, init) => request('DELETE', path, undefined, init),
  };
}

export const http = createHttpClient();
