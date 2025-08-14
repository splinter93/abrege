module.exports = {
  // Configuration spécifique pour les tests d'intégration Groq
  displayName: 'Groq Integration Tests',
  
  // Dossier de test
  testMatch: [
    '<rootDir>/src/services/llm/services/__tests__/*.integration.test.ts'
  ],
  
  // Exclure les tests unitaires
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/.*\\.test\\.ts$' // Exclure les tests unitaires
  ],
  
  // Configuration des mocks
  setupFilesAfterEnv: [
    '<rootDir>/src/services/llm/services/__tests__/setup.integration.ts'
  ],
  
  // Timeout plus long pour les tests d'intégration
  testTimeout: 30000,
  
  // Configuration des collecteurs de couverture
  collectCoverageFrom: [
    'src/services/llm/services/**/*.ts',
    'src/services/llm/validation/**/*.ts',
    'src/services/llm/types/**/*.ts',
    '!src/services/llm/services/**/*.test.ts',
    '!src/services/llm/services/**/*.spec.ts'
  ],
  
  // Seuil de couverture pour les tests d'intégration
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Configuration des reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit-integration.xml',
        classNameTemplate: '{classname}-{title}',
        titleTemplate: '{classname}-{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Configuration des variables d'environnement
  setupFiles: [
    '<rootDir>/src/services/llm/services/__tests__/env.integration.ts'
  ],
  
  // Configuration des transformations
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        }
      }
    ]
  },
  
  // Configuration des modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1'
  },
  
  // Configuration des extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Configuration des globals
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Configuration des tests en parallèle
  maxWorkers: 1, // Tests d'intégration séquentiels pour éviter les conflits
  
  // Configuration des hooks
  testEnvironment: 'node',
  
  // Configuration des timeouts
  slowTestThreshold: 10,
  
  // Configuration des retries
  retryTimes: 1,
  
  // Configuration des snapshots
  snapshotSerializers: [],
  
  // Configuration des watchman
  watchman: false,
  
  // Configuration des notifications
  notify: false,
  
  // Configuration des verbosités
  verbose: true,
  
  // Configuration des erreurs
  errorOnDeprecated: true,
  
  // Configuration des warnings
  silent: false
}; 