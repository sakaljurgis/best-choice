import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import apiRouter from './routes/api-router.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

app.use(express.json());
app.use(env.apiBasePath, apiRouter);

if (env.client.serve) {
  const clientDistPath = env.client.distPath;
  const indexHtmlPath = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(clientDistPath) && fs.existsSync(indexHtmlPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }

      const basePath = env.apiBasePath.endsWith('/')
        ? env.apiBasePath
        : `${env.apiBasePath}/`;

      if (
        env.apiBasePath &&
        env.apiBasePath !== '/' &&
        (req.path === env.apiBasePath || req.path.startsWith(basePath))
      ) {
        return next();
      }

      return res.sendFile(indexHtmlPath);
    });
  } else {
    console.warn(
      `Static client assets not served because the build output was not found at "${clientDistPath}".`
    );
  }
}

app.use(errorHandler);

export default app;
