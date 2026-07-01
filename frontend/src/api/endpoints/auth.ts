import { request } from '../client';
import type { LoginRequest, LoginResponse } from '../types/auth';

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
