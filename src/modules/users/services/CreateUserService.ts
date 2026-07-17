import { hash } from 'bcryptjs'; // Importação nova
import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';
import { CreateUserRawData } from '../schemas/createUser.schema';

export class CreateUserService {
  private usersRepository: UsersRepository;

  constructor() {
    this.usersRepository = new UsersRepository();
  }

  async execute({ name, email, password }: CreateUserRawData, organization_id?: string, role?: string) {
    const emailExists = await this.usersRepository.findByEmail(email);

    if (emailExists) {
      throw new AppError('Este endereço de e-mail já está sendo utilizado.', 400);
    }

    // 1. Gerar o hash da senha (o número 8 é o fator de custo, balanceando segurança e velocidade)
    const passwordHash = await hash(password, 8);

    // 2. Salvar o usuário usando o hash no lugar da senha original
    const user = await this.usersRepository.create({ 
      name, 
      email, 
      password_hash: passwordHash,
      organization_id,
      role
    });

    return user;
  }
}