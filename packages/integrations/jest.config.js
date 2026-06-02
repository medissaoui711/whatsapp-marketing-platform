/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@repo/db$': '<rootDir>/../../packages/db/src',
    '^@repo/auth$': '<rootDir>/../../packages/auth/src',
    '^@repo/shared$': '<rootDir>/../../packages/shared/src',
    '^@repo/integrations$': '<rootDir>/../../packages/integrations/src',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}
