import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests intégration flows critiques
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeout par test
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  // Exécution en parallèle
  fullyParallel: true,
  
  // Fail le build si des tests échouent
  forbidOnly: !!process.env.CI,
  
  // Relancer les tests qui échouent
  retries: process.env.CI ? 2 : 0,
  
  // Workers en CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: process.env.CI ? 'html' : 'list',
  
  // Configuration partagée
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  // Projets pour différents navigateurs
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Optionnel: ajouter Firefox et WebKit si nécessaire
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Serveur de développement (si nécessaire)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

