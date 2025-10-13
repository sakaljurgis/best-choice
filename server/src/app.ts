import express from 'express';
import apiRouter from './routes/api-router.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

app.use(express.json());
app.use(env.apiBasePath, apiRouter);
app.use(errorHandler);

export default app;
