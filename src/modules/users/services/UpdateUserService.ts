import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';

export class UpdateUserService {
  async execute(id: number, name: string, email: string) {
    if (!name || !email) {
      throw new AppError('Nome e e-mail são obrigatórios.');
    }

    const usersRepository = new UsersRepository();
    
    // Verifica se o email já existe em outro usuário
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser && existingUser.id !== id) {
      throw new AppError('Este e-mail já está em uso por outro usuário.');
    }

    const user = await usersRepository.update(id, name, email);

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return user;
  }
}
