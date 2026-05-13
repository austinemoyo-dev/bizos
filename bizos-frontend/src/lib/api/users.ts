import { api } from './client';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface UserRegisterPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

export const usersApi = {
  list: () => api.get<UserRecord[]>('/auth/users'),
  register: (data: UserRegisterPayload) => api.post<UserRecord>('/auth/register', data),
  update: (id: string, data: { role?: string; is_active?: boolean }) =>
    api.patch<UserRecord>(`/auth/users/${id}`, data),
};
