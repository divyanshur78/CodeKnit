import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data as T;
}

export const authService = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginRequest): Promise<AuthResponse> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCurrentUser(): Promise<{ user: UserProfile }> {
    return request('/api/auth/me');
  },

  logout(): Promise<{ message: string }> {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  requestPasswordReset(payload: ForgotPasswordRequest): Promise<{ message: string }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
