export interface UserInfo {
  id: number
  username: string
  email: string | null
  roles: string[]
  employeeId?: number | null
  /** How many employees list this user as manager (team leave / approvals). */
  directReportCount?: number
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
