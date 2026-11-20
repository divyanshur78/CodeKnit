export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  username: string;
  createdAt?: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthResponse {
  user: UserProfile;
  message?: string;
}

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}
