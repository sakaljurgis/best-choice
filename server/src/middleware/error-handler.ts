import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        details: error.details ?? null
      }
    });
    return;
  }

  console.error('Unhandled error', error);
  res.status(500).json({
    error: {
      message: 'Internal Server Error'
    }
  });
};
