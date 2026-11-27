import { apiRequest } from './client'

export type UserRole = 'owner' | 'manager' | 'employee'

export interface Store {
  id: number
  name: string
  address: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  isActive: boolean
  stores: Store[]
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me')
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<{ token: string }> {
  return apiRequest<{ token: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
