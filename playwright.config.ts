import { defineConfig } from '@playwright/test';
import { getConfig } from './src/config/environments';

const env = getConfig();

export default defineConfig({
  // Carpeta raíz de tests
  testDir: './src/tests',

  // Patrón de archivos de test
  testMatch: ['**/*.spec.ts', '**/*.flow.ts'],

  // Timeout por test (30s - llamadas HTTP reales)
  timeout: 30_000,

  // Timeout para expect()
  expect: { timeout: 10_000 },

  // Reintento en CI, ninguno en local para debugging más rápido
  retries: process.env.CI ? 1 : 0,

  // Workers: 1 para mantener orden en flujos E2E
  workers: 1,

  // Setup global para preparar datos (token VISA)
  globalSetup: './global-setup.ts',

  // Reportes
  reporter: [
    ['list'],                                          // consola con detalles
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    // URL base del ambiente — usada en request.get('/api/bank')
    baseURL: `${env.baseUrl}${env.apiPath}`,

    // Headers por defecto en todas las requests
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },

    // Grabar traces en el primer reintento para debugging
    trace: 'on-first-retry',

    // Ignorar errores TLS en staging (si hay self-signed cert)
    ignoreHTTPSErrors: true,
  },

  // Proyectos para correr suites y flows por separado
  projects: [
    {
      name: 'suites',
      testMatch: '**/suites/**/*.spec.ts',
    },
    {
      name: 'flows',
      testMatch: '**/flows/**/*.flow.ts',
      // Los flujos necesitan más tiempo
      use: { actionTimeout: 20_000 },
    },
    {
      name: 'smoke',
      grep: /@smoke/,
      testMatch: ['**/suites/**/*.spec.ts', '**/flows/**/*.flow.ts'],
    },
  ],
});
