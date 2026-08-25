import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { AppError } from '../../../errors/AppError';

interface TokenPayload {
  iat: number;
  exp: number;
  sub: string;
  role: string;
  organization_id?: string;
  is_super_admin?: boolean;
}

export function isAdmin(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError('Token JWT está faltando.', 401);
  }

  const [, token] = authHeader.split(' ');

  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = verify(token, secret);

    const { sub, role, organization_id, is_super_admin } = decoded as TokenPayload;

    if (role !== 'admin') {
      throw new AppError('Acesso negado. Apenas administradores podem realizar esta ação.', 403);
    }

    request.user = {
      id: sub,
      organization_id: organization_id as string,
      role,
      is_super_admin: is_super_admin as boolean
    };

    return next();
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('Token JWT inválido.', 401);
  }
}
