// global-setup.ts
import { request, APIRequestContext } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';
import { persistSettingsCache } from './src/helpers/settings-cache';
import { getConfig } from './src/config/environments';

/**
 * Carga un archivo .env manualmente en process.env.
 * Necesario porque la carga automática de .env se añadió en Playwright 1.45;
 * este proyecto usa ^1.44, así que lo hacemos nosotros.
 * Solo asigna variables que aún no existen en el entorno (respeta variables de CI).
 */
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// Carga .env antes de cualquier llamada a getConfig() o process.env.*
const root = path.resolve(__dirname);
loadEnvFile(path.join(root, '.env'));

interface TokenResponse {
  access_token: string;
}

interface TokenizeResponse {
  creditCardTokenId: string;
}

/**
 * Get access token from auth server using Resource Owner Password Grant.
 * @param ctx      APIRequestContext sin baseURL — usa la URL absoluta del token endpoint.
 * @param tokenUrl URL completa del endpoint de Azure AD (desde config.tokenUrl).
 * @returns The access token string.
 */
async function fetchAccessToken(ctx: APIRequestContext, tokenUrl: string): Promise<string> {
  const res = await ctx.post(tokenUrl, {
    form: {
      grant_type:    'password',
      client_id:     '20253881-7d19-488c-bd70-4a7cb3ebe29a',
      client_secret: process.env.CLIENT_SECRET ?? '',
      username:      process.env.TEST_USER     ?? '',
      password:      process.env.TEST_PASSWORD ?? '',
      scope:         'openid profile email api://bruno-desktop/read',
    },
  });

  if (!res.ok()) {
    throw new Error(`Auth failed: ${res.status()} ${await res.text()}`);
  }

  const { access_token } = (await res.json()) as TokenResponse;
  return access_token;
}

/**
 * Tokenize a VISA card using the API to get a token ID for tests. This simulates what the frontend does before calling the gRPC service with card payments.
 * @param apiCtx APIRequestContext already authenticated with the access token, to call the tokenization endpoint.
 * @returns The token ID for the VISA card.
 */
async function tokenizeVisaCard(apiCtx: APIRequestContext): Promise<string> {
  const res = await apiCtx.post('api/payment/tokenize', {
    data: {
      name:                 'APPROVED',
      identificationNumber: '32144457',
      paymentMethod:        'VISA',
      cardNumber:           '4097440000000004',
      expirationDate:       `${new Date().getFullYear() + 1}/01`,
      paymentProvider:      1,
    },
  });

  if (!res.ok()) {
    throw new Error(`Tokenize failed: ${res.status()} ${await res.text()}`);
  }

  const { creditCardTokenId } = (await res.json()) as TokenizeResponse;
  return creditCardTokenId;
}

/**
 * Global setup function for Playwright tests. Fetches access token and tokenizes VISA card,
 * then saves both in a local JSON file for test suites to consume.
 * This runs once before all tests, improving performance by avoiding redundant calls in each test.
 */
export default async function globalSetup() {
  const config = getConfig();

  if (!config.tokenUrl) {
    throw new Error('[global-setup] TOKEN_URL no está definido. Revisa tu archivo .env');
  }

  console.log(`[global-setup] ENV="${config.name}" | tokenUrl=${config.tokenUrl} | baseURL=${config.baseUrl}${config.apiPath}`);

  // Contexto para auth: sin baseURL, llama directamente a la URL absoluta del token endpoint
  const ctx   = await request.newContext();
  const token = await fetchAccessToken(ctx, config.tokenUrl);

  process.env.API_TOKEN = token;

  const apiCtx = await request.newContext({
    baseURL:          `${config.baseUrl}${config.apiPath}`,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    ignoreHTTPSErrors: true,
  });

  const visaTokenId = await tokenizeVisaCard(apiCtx);

  persistSettingsCache({ accessToken: token, visaTokenId });

  await ctx.dispose();
  await apiCtx.dispose();
}
