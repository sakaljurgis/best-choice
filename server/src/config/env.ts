import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

config({ path: path.resolve(rootDir, '.env') });

const port = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3000);
const urlReaderBaseUrl = (process.env.URL_READER_BASE_URL ?? 'https://r.jina.ai').replace(
  /\/$/,
  ''
);
const urlReaderApiKey = process.env.URL_READER_API_KEY ?? '';

export const env = {
  port,
  apiBasePath: process.env.API_BASE_PATH ?? '/api',
  databaseUrl: process.env.DATABASE_URL ?? '',
  appName: process.env.APP_NAME ?? 'BestChoice',
  urlReader: {
    baseUrl: urlReaderBaseUrl,
    apiKey: urlReaderApiKey
  }
};
