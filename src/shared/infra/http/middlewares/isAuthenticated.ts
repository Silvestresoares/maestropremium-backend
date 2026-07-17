import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

// Formato que esperamos de dentro do Token
interface TokenPayload {
  iat: number;
  exp: number;
  sub: string;
  role?: string;
  organization_id?: string;
}

// No longer needed because of @types/express/index.d.ts

export function isAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction
) {
  // 1. Pegar o token pelo cabeçalho de autorização
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).json({ error: 'Token não enviado (JWT Token is missing).' });
  }

  // O formato do authHeader é: "Bearer asjdfhkj..." 
  // Usamos a desestruturação para ignorar a palavra "Bearer" e pegar só o token.
  const [, token] = authHeader.split(' ');

  try {
    // 2. Verificar se o token é válido usando a chave do .env
    const decoded = verify(token, process.env.JWT_SECRET as string);

    // 3. Pegar os dados customizados e o ID
    const { sub, organization_id, role } = decoded as TokenPayload;

    // 4. Injetar o ID do usuário na requisição para as próximas rotas saberem quem está logado
    request.user = {
      id: sub,
      organization_id,
      role
    };

    // 5. Tudo certo! Deixa a requisição seguir em frente.
    return next();
  } catch (err) {
    return response.status(401).json({ error: 'Token inválido (Invalid JWT Token).' });
  }
}