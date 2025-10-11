import { Request, Response } from 'express';

export function getHealth(_req: Request, res: Response) {
  res.json({ status: 'ok', service: 'best-choice-api' });
}
