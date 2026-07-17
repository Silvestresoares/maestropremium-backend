import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';
import { AuthenticateUserRawData } from '../schemas/authenticate.schema';

export class AuthenticateUserService {
  private usersRepository: UsersRepository;

  constructor() {
    this.usersRepository = new UsersRepository();
  }

  async execute({ email, password }: AuthenticateUserRawData) {
    // 1. Busca o usuário
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Email ou senha incorretos.', 401);
    }

    // 2. Compara a senha enviada com o hash salvo
    const passwordMatch = await compare(password, user.password_hash);

    if (!passwordMatch) {
      throw new AppError('Email ou senha incorretos.', 401);
    }

    const activeRole = user.org_role || user.legacy_role || 'musician';
    
    // 3. Gera o Token JWT
    // Nota: O secret deve vir do seu .env
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    const token = sign({ 
      role: activeRole, 
      organization_id: user.organization_id 
    }, secret, {
      subject: user.id.toString(), // ID do usuário como "sub"
      expiresIn: '1d', // Token expira em 1 dia
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: activeRole,
        organization_id: user.organization_id
      },
      token,
    };
  }
}