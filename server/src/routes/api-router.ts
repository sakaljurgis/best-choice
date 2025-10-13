import { Router } from 'express';
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem
} from '../controllers/items-controller.js';
import {
  createItemPrice,
  deleteItemPrice,
  getItemPrice,
  listItemPrices,
  updateItemPrice
} from '../controllers/item-prices-controller.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject
} from '../controllers/projects-controller.js';
import { asyncHandler } from '../utils/async-handler.js';

const apiRouter = Router();

// Projects
apiRouter.get('/projects', asyncHandler(listProjects));
apiRouter.post('/projects', asyncHandler(createProject));
apiRouter.get('/projects/:projectId', asyncHandler(getProject));
apiRouter.patch('/projects/:projectId', asyncHandler(updateProject));
apiRouter.delete('/projects/:projectId', asyncHandler(deleteProject));

// Project items
apiRouter.get('/projects/:projectId/items', asyncHandler(listItems));
apiRouter.post('/projects/:projectId/items', asyncHandler(createItem));

// Items
apiRouter.get('/items/:itemId', asyncHandler(getItem));
apiRouter.patch('/items/:itemId', asyncHandler(updateItem));
apiRouter.delete('/items/:itemId', asyncHandler(deleteItem));

// Item prices
apiRouter.get('/items/:itemId/prices', asyncHandler(listItemPrices));
apiRouter.post('/items/:itemId/prices', asyncHandler(createItemPrice));
apiRouter.get('/prices/:priceId', asyncHandler(getItemPrice));
apiRouter.patch('/prices/:priceId', asyncHandler(updateItemPrice));
apiRouter.delete('/prices/:priceId', asyncHandler(deleteItemPrice));

export default apiRouter;
