import type { Request, Response } from 'express';
import { app } from '../server.js';

export default function handler(req: Request, res: Response) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const route = requestUrl.searchParams.get('route')?.replace(/\/+$/, '');
  if (!route || route.split('/').some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    return res.status(404).json({ error: 'Rota da API não encontrada.' });
  }
  requestUrl.searchParams.delete('route');
  req.url = `/api/${route}${requestUrl.search}`;
  app(req, res);
}
