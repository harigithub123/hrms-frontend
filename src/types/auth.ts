export interface UserInfo {
  id: number
  username: string
  email: string | null
  roles: string[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  tokenType: string
  user: UserInfo
}

export interface LoginRequest {
  username: string
  password: string
}
