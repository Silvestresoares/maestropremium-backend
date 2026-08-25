import { Request, Response } from 'express';
import { AuthenticateUserService } from '../services/AuthenticateUserService';
import { authenticateSchema } from '../schemas/authenticate.schema';

export class SessionsController {
  async create(request: Request, response: Response): Promise<Response> {
    // 1. Validamos os dados de entrada
    const { email, password } = authenticateSchema.parse(request.body);

    // 2. Chamamos o serviço
    const authenticateUserService = new AuthenticateUserService();
    const { user, token } = await authenticateUserService.execute({ 
      email, 
      password 
    });

    // 3. Retornamos o usuário e o token
    return response.json({ user, token });
  }
}