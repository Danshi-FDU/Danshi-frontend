import { createHttpClient } from '@/src/lib/http/client';
import { AuthStorage } from '@/src/lib/auth/auth_storage';

export const httpAuth = createHttpClient({ getAuthToken: AuthStorage.getToken });
