import express from 'express';
import apiRouter from './routes/api-router.js';
import { env } from './config/env.js';

const app = express();

app.use(express.json());
app.use(env.apiBasePath, apiRouter);

export default app;
