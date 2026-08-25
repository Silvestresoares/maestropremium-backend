import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';

export class UpdateUserRoleService {
  async execute(id: number | string, role: string, organization_id?: string) {
    if (role !== 'admin' && role !== 'musician') {
      throw new AppError('Role inválido. Deve ser admin ou musician.');
    }

    const usersRepository = new UsersRepository();
    const user = await usersRepository.updateRole(id, role, organization_id);

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return user;
  }
}
