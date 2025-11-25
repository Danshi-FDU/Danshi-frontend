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
    ...(opts.defaultHeaders ?? {}),
  } as Record<string, string>;

  const isBodyInit = (value: unknown): value is BodyInit => {
    if (value == null) return false;
    if (typeof value === 'string') return true;
    if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
    if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true;
    if (typeof ArrayBuffer !== 'undefined' && (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) return true;
    return false;
  };

  async function request<T>(method: HttpMethod, path: string, body?: any, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const token = await opts.getAuthToken?.();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...defaultHeaders,
        ...(init?.headers as any)
      };
      const bodyIsBodyInit = isBodyInit(body);
      const payload: BodyInit | undefined = body == null ? undefined : bodyIsBodyInit ? (body as BodyInit) : JSON.stringify(body);

      if (bodyIsBodyInit) {
        const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
        if (isMultipart) delete headers['Content-Type'];
      } else if (body != null) {
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      }

      if (token) headers['Authorization'] = `Bearer ${token}`;

      const { headers: _ignoredHeaders, ...restInit } = init ?? {};

      const fullUrl = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
      // eslint-disable-next-line no-console
      console.log(`[HttpClient] ${method} ${fullUrl}`, {
        headers: { ...headers, Authorization: headers['Authorization'] ? 'Bearer ***' : 'None' },
        body: bodyIsBodyInit ? 'Blob/FormData' : payload
      });

      const res = await fetch(fullUrl, {
        method,
        headers,
        body: payload,
        signal: controller.signal,
        ...restInit,
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
      // eslint-disable-next-line no-console
      console.error('[HttpClient] Request failed:', method, path, e);
      const name = (e && typeof e === 'object') ? (e as any).name : undefined;
      if (name === 'AbortError') {
        throw new AppError('请求超时', { code: 'TIMEOUT', cause: e });
      }

      // 浏览器在遇到 CORS 问题或网络失败时通常抛出 TypeError: Failed to fetch
      // 无法从浏览器端读取响应头/状态，故此处将其包装为更具可操作性的错误信息
      if (typeof e === 'object' && e instanceof TypeError) {
        throw new AppError(
          '网络错误或 CORS 限制：无法完成请求（请检查后端是否返回 Access-Control-Allow-Origin 或使用代理）。',
          { code: 'CORS_OR_NETWORK', cause: e }
        );
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
