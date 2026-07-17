import { UsersRepository } from '../repositories/UsersRepository';

export class ListUsersService {
  async execute(organization_id?: string) {
    const usersRepository = new UsersRepository();
    const users = await usersRepository.findAll(organization_id);
    return users;
  }
}
