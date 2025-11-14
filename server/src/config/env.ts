import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

config({ path: path.resolve(rootDir, '.env') });

const resolvePath = (inputPath: string) =>
  path.isAbsolute(inputPath) ? inputPath : path.resolve(rootDir, inputPath);

const port = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3000);
const urlReaderBaseUrl = (process.env.URL_READER_BASE_URL ?? 'https://r.jina.ai').replace(
  /\/$/,
  ''
);
const urlReaderApiKey = process.env.URL_READER_API_KEY ?? '';
const llmApiUrl = process.env.LLM_API_URL ?? '';
const llmApiKey = process.env.LLM_API_KEY ?? '';
const llmModel = process.env.LLM_MODEL ?? 'gpt-4o-mini';
const serveClient = process.env.SERVE_CLIENT !== 'false';
const clientDistPath = resolvePath(process.env.CLIENT_DIST_PATH ?? 'client/dist');

export const env = {
  port,
  apiBasePath: process.env.API_BASE_PATH ?? '/api',
  databaseUrl: process.env.DATABASE_URL ?? '',
  appName: process.env.APP_NAME ?? 'BestChoice',
  urlReader: {
    baseUrl: urlReaderBaseUrl,
    apiKey: urlReaderApiKey
  },
  llm: {
    apiUrl: llmApiUrl,
    apiKey: llmApiKey,
    model: llmModel
  },
  client: {
    serve: serveClient,
    distPath: clientDistPath
  }
};
