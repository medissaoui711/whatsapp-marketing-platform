export interface JwtPayload {
  userId: string
  email: string
  role: string
  tenantId: string
  isSuperAdmin?: boolean
  roleId?: string
  organizationId?: string
  sessionId?: string
  jti?: string
  sub?: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResult {
  user: {
    id: string
    email: string
    name: string | null
    role: string
  }
  tokens: Tokens
}


