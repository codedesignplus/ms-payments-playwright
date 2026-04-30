/**
 * fixtures.ts
 * Extiende los fixtures base de Playwright con:
 *   - `api`     → APIRequestContext autenticado (Bearer token)
 *   - `anonApi` → APIRequestContext anónimo (sin token)
 *   - `grpc`    → cliente gRPC listo para usar
 *   - `env`     → configuración del ambiente activo
 *
 * Uso en tests:
 *   import { test, expect } from '../fixtures';
 *   test('...', async ({ api, anonApi, grpc, env }) => { ... });
 */

import { test as base, APIRequestContext, request } from '@playwright/test';
import { getConfig, EnvConfig } from '../config/environments';
import { createGrpcClient, GrpcClient } from '../helpers/grpc-client';

interface PaymentsFixtures {
  env: EnvConfig;
  api: APIRequestContext;
  anonApi: APIRequestContext;
  grpc: GrpcClient;
}

export const test = base.extend<PaymentsFixtures>({
  // Configuración del ambiente activo
  env: async ({}, use) => {
    await use(getConfig());
  },

  // Cliente HTTP autenticado con Bearer token
  api: async ({ env }, use) => {
    const ctx = await request.newContext({
      baseURL: `${env.baseUrl}${env.apiPath}`,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.authToken ? { Authorization: `Bearer ${env.authToken}` } : {}),
      },
    });

    await use(ctx);
    await ctx.dispose();
  },

  // Cliente HTTP anónimo (sin token — para AllowAnonymous)
  anonApi: async ({ env }, use) => {
    const ctx = await request.newContext({
      baseURL: `${env.baseUrl}${env.apiPath}`,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  // Cliente gRPC con auth
  grpc: async ({}, use) => {
    const client = createGrpcClient();
    await use(client);
    client.close();
  },
});

export { expect } from '@playwright/test';
