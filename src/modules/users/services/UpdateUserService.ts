import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';

export class UpdateUserService {
  async execute(id: string | number, name: string, email: string, organization_id?: string) {
    if (!name || !email) {
      throw new AppError('Nome e e-mail são obrigatórios.');
    }

    const usersRepository = new UsersRepository();
    
    if (organization_id) {
      const inOrg = await usersRepository.checkUserInOrganization(id, organization_id);
      if (!inOrg) {
        throw new AppError('Usuário não encontrado ou sem permissão.', 404);
      }
    }

    // Verifica se o email já existe em outro usuário
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser && existingUser.id != id) {
      throw new AppError('Este e-mail já está em uso por outro usuário.');
    }

    const user = await usersRepository.update(id, name, email);

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return user;
  }
}
