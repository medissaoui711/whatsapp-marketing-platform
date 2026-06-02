import jwt from 'jsonwebtoken'
import { type JwtPayload, type Tokens } from './types'

export type { JwtPayload }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret'

export function signAccessToken(payload: JwtPayload): string {
  const expiryMins = parseInt(process.env.JWT_ACCESS_EXPIRY_MINS || '15');
  return jwt.sign(
    { ...payload, iss: 'whatomate' },
    JWT_SECRET,
    { expiresIn: expiryMins * 60 },
  )
}

export function signRefreshToken(payload: JwtPayload): string {
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7');
  return jwt.sign(
    { ...payload, iss: 'whatomate' },
    REFRESH_SECRET,
    { expiresIn: expiryDays * 24 * 60 * 60 },
  )
}

export function generateTokens(payload: JwtPayload): Tokens {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function generateWSToken(userId: string, organizationId: string): string {
  return jwt.sign(
    { userId, organizationId, sub: 'ws', iss: 'whatomate' },
    JWT_SECRET,
    { expiresIn: '30s' },
  )
}


