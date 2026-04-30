import * as fs from 'fs';

const CACHE_PATH = '.settings-cache.json';

export interface SettingsCache {
  accessToken: string;
  visaTokenId: string;
}

/**
 * Persist the access token and VISA token ID in a local JSON file for test suites to consume. 
 * @param cache Object containing the access token and VISA token ID to persist. 
 */
export function persistSettingsCache(cache: SettingsCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  
  console.log(`✅ Settings cache saved → ${CACHE_PATH}`);
}

/**
 * Read the persisted settings cache from the local JSON file. 
 * @returns The SettingsCache object if the file exists, or null if it doesn't. 
 */
export function readSettingsCache(): SettingsCache | null {
  if (!fs.existsSync(CACHE_PATH)) 
    return null;

  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as SettingsCache;
}