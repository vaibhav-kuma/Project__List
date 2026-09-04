module.exports = {
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/apps/api/src/**/*.test.ts'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/apps/api/src/$1' },
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/apps/web/src/**/*.test.{ts,tsx}'],
      transform: { '^.+\\.tsx?$': 'ts-jest' },
      setupFilesAfterSetup: ['@testing-library/jest-dom'],
    },
  ],
};
