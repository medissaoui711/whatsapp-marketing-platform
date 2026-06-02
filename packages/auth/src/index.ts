export * from './jwt'
export { AuthMiddleware } from './middleware'
export type { AuthResult } from './middleware'
export * from './types'
export * from './rbac-middleware'
export * from './rate-limit'
export * from './rate-limit-helper'
export * from './with-auth'
export * from './tenant-context'
export * from './encryption'
export * from './cookies'
export * from './2fa'
export * from './session'
export * from './password'

// Middleware (avoid re-export conflicts with existing modules)
export {
  authMiddleware,
  getAuth,
} from './middleware/auth';
export type {
  AuthContext,
  RequestWithAuth,
  AuthOptions,
} from './middleware/auth';
export {
  corsMiddleware,
  parseAllowedOrigins,
  isOriginAllowed,
} from './middleware/cors';
export type { CORSOptions } from './middleware/cors';
export { csrfProtectionMiddleware, withCSRFProtection } from './middleware/csrf';
export { extractClientIP } from './middleware/ip-extractor';
export { requestLoggerMiddleware } from './middleware/logger';
export type { LoggerOptions } from './middleware/logger';
export { recoveryMiddleware } from './middleware/recovery';
export { requirePermission, requireAnyPermission } from './middleware/permissions';
export type { PermissionChecker } from './middleware/permissions';
export { organizationContextMiddleware } from './middleware/organization';
export type { OrganizationContext, RequestWithOrg } from './middleware/organization';
export { rateLimitMiddleware, userAwareRateLimitMiddleware, withRateLimit } from './middleware/rate-limit';
export type { RateLimitOptions, UserAwareRateLimitOptions } from './middleware/rate-limit';
export { securityHeadersMiddleware } from './middleware/security';
export { checkFeatureAccess, FEATURE_PATH_MAP } from './feature-guard';
export type { FeatureCheck } from './feature-guard';


