/**
 * api-paths.ts
 * Helper para normalizar paths de API para Playwright
 *
 * IMPORTANTE: Los paths NO deben empezar con "/" porque Playwright usa new URL(path, baseURL)
 * y cuando path empieza con "/", ignora el path del baseURL.
 * El apiPath ya está incluido en el baseURL del fixture.
 */

/**
 * Normaliza la ruta del endpoint removiendo el leading slash si existe.
 * @param path Ruta del endpoint (ej: '/api/...' o 'api/...')
 * @returns Ruta sin leading slash (ej: 'api/...')
 */
export function apiPath(path: string): string {
  return path.startsWith('/') ? path.substring(1) : path;
}
