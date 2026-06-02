export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  MODERATOR: 'MODERATOR',
} as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const

export const QUEUES = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  NOTIFICATION: 'notification',
  BILLING: 'billing',
  RECIPIENT: 'recipient-jobs',
} as const


