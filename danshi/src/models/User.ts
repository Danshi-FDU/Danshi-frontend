export type Gender = 'male' | 'female';

export interface User {
  id: string;
  email: string;
  name: string;
  gender?: Gender;
  hometown?: string;
  role: 'user' | 'admin' | 'super_admin';
  avatarUrl?: string | null;
}
