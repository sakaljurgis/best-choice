import { Router } from 'express';
import { getHealth } from '../controllers/health-controller.js';

const apiRouter = Router();

apiRouter.get('/health', getHealth);

export default apiRouter;
