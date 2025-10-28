import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/src/constants/app';

export type AppConfig = {
  apiBaseUrl: string;
  requestTimeoutMs: number;
};

const config: AppConfig = {
  apiBaseUrl: API_BASE_URL,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
};

export default config;
