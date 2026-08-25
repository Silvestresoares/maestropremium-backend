import { UsersRepository } from '../repositories/UsersRepository';

export class DeleteUserService {
  async execute(id: number | string, organization_id?: string) {
    const usersRepository = new UsersRepository();
    await usersRepository.delete(id, organization_id);
  }
}
