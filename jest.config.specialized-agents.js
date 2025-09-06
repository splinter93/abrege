/**
 * Configuration Jest pour les tests des agents spécialisés
 */

module.exports = {
  displayName: 'Specialized Agents Tests',
  testMatch: [
    '<rootDir>/src/tests/specializedAgents.test.ts'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: [
    'src/services/specializedAgents/**/*.ts',
    'src/types/specializedAgents.ts',
    'src/hooks/useSpecializedAgents.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage/specialized-agents',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  testTimeout: 30000,
  verbose: true
};
