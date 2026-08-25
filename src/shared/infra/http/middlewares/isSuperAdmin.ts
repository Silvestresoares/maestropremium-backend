import { Request, Response, NextFunction } from 'express';

export function isSuperAdmin(
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (!request.user || !request.user.is_super_admin) {
    return response.status(403).json({ error: 'Acesso negado. Apenas super administradores podem acessar esta rota.' });
  }

  return next();
}
