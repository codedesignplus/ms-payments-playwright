/**
 * environments.ts
 * Configuración por ambiente. Selecciona con la variable ENV:
 *
 *   ENV=staging npx playwright test
 *   ENV=local   npx playwright test
 */
import { readSettingsCache } from './../helpers/settings-cache';

export type EnvName = 'staging' | 'local';

export interface EnvConfig {
  name: EnvName;
  baseUrl: string;
  apiPath: string;
  grpcUrl: string;
  grpcSecure: boolean;
  payuApiKey: string;
  payuMerchantId: string;
  authToken: string;
  tokenUrl: string;
}

// Valores estáticos por ambiente (no dependen de variables de entorno)
const staticConfigs: Record<EnvName, Omit<EnvConfig, 'authToken' | 'tokenUrl'>> = {
  staging: {
    name: 'staging',
    baseUrl: 'https://services.kappali.com',
    apiPath: '/ms-payments',
    grpcUrl: 'services.kappali.com:5001',
    grpcSecure: true,
    payuApiKey: '4Vj8eK4rloUd272L48hsrarnUA',
    payuMerchantId: '508029',
  },
  local: {
    name: 'local',
    baseUrl: 'http://localhost:5000',
    apiPath: '',
    grpcUrl: 'localhost:5001',
    grpcSecure: false,
    payuApiKey: '4Vj8eK4rloUd272L48hsrarnUA',
    payuMerchantId: '508029',
  },
};

export function getConfig(): EnvConfig {
  const envName = (process.env.ENV ?? 'local') as EnvName;
  const base = staticConfigs[envName];

  if (!base) {
    throw new Error(`ENV="${envName}" inválido. Usa "staging" o "local".`);
  }

  // authToken y tokenUrl se leen en tiempo de llamada para que
  // Playwright ya haya cargado el .env antes de que se evalúen.
  return {
    ...base,
    authToken: readSettingsCache()?.accessToken ?? process.env.AUTH_TOKEN ?? '',
    tokenUrl:  process.env.TOKEN_URL ?? '',
  };
}
