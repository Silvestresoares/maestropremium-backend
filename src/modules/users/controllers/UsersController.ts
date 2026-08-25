import { Request, Response } from 'express';
import { CreateUserService } from '../services/CreateUserService';
import { RegisterTenantService } from '../services/RegisterTenantService';
import { ListUsersService } from '../services/ListUsersService';
import { UpdateUserRoleService } from '../services/UpdateUserRoleService';
import { UpdateUserService } from '../services/UpdateUserService';
import { DeleteUserService } from '../services/DeleteUserService';
import { createUserSchema } from '../schemas/createUser.schema';
import { ForgotPasswordService } from '../services/ForgotPasswordService';
import { ResetPasswordService } from '../services/ResetPasswordService';
import { UpdateUserPasswordService } from '../services/UpdateUserPasswordService';

export class UsersController {
  async changePassword(request: Request, response: Response): Promise<Response> {
    const currentUser = request.user;
    
    if (!currentUser) return response.status(401).json({ error: 'Não autorizado' });

    const updateUserPasswordService = new UpdateUserPasswordService();
    await updateUserPasswordService.execute(Number(currentUser.id), request.body);

    return response.status(204).send();
  }
  async register(request: Request, response: Response): Promise<Response> {
    const { name, email, password, organizationName, phone, acceptedTerms, isAdult } = request.body;
    
    // Captura o IP para registro do consentimento LGPD
    const ipAddress = request.ip || request.connection.remoteAddress || '0.0.0.0';

    const registerTenantService = new RegisterTenantService();
    const result = await registerTenantService.execute({ name, email, password, organizationName, phone, acceptedTerms, isAdult, ipAddress });

    return response.status(201).json(result);
  }

  async forgotPassword(request: Request, response: Response): Promise<Response> {
    const { email } = request.body;

    const forgotPasswordService = new ForgotPasswordService();
    await forgotPasswordService.execute(email);

    return response.status(204).send();
  }

  async resetPassword(request: Request, response: Response): Promise<Response> {
    const { token, newPassword } = request.body;

    const resetPasswordService = new ResetPasswordService();
    await resetPasswordService.execute(token, newPassword);

    return response.status(204).send();
  }

  async create(request: Request, response: Response): Promise<Response> {
    const validatedData = createUserSchema.parse(request.body);

    const currentUser = request.user;
    const createUserService = new CreateUserService();
    const user = await createUserService.execute(validatedData, currentUser?.organization_id);

    return response.status(201).json(user);
  }

  async index(request: Request, response: Response): Promise<Response> {
    const currentUser = request.user;
    const listUsersService = new ListUsersService();
    const users = await listUsersService.execute(currentUser?.organization_id);

    return response.json(users);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { name, email } = request.body;
    const currentUser = request.user;

    const updateUserService = new UpdateUserService();
    const user = await updateUserService.execute(id, name, email, currentUser?.organization_id);

    return response.json(user);
  }

  async updateRole(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { role } = request.body;
    const currentUser = request.user;

    const updateUserRoleService = new UpdateUserRoleService();
    const user = await updateUserRoleService.execute(id, role, currentUser?.organization_id);

    return response.json(user);
  }

  async delete(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;

    const currentUser = request.user;
    if (currentUser?.id == id) {
      return response.status(400).json({ error: 'Você não pode deletar a si mesmo.' });
    }

    const deleteUserService = new DeleteUserService();
    await deleteUserService.execute(id, currentUser?.organization_id);

    return response.status(204).send();
  }

  async deleteMe(request: Request, response: Response): Promise<Response> {
    const currentUser = request.user;
    
    if (!currentUser?.id) {
      return response.status(401).json({ error: 'Usuário não autenticado.' });
    }

    // A exclusão agora vai direto para o repositório principal para fazer o hard delete na tabela users
    const { UsersRepository } = await import('../repositories/UsersRepository');
    const usersRepository = new UsersRepository();
    await usersRepository.deleteAccount(currentUser.id);

    return response.status(204).send();
  }

  // LGPD: Exportação de dados do titular (Portabilidade)
  async exportData(request: Request, response: Response): Promise<Response> {
    const currentUser = request.user;
    if (!currentUser?.id) {
      return response.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const { UsersRepository } = await import('../repositories/UsersRepository');
    const usersRepository = new UsersRepository();
    const user = await usersRepository.findById(currentUser.id);

    if (!user) {
      return response.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Exemplo estruturado para exportação (Aqui poderia agrupar escalas, etc)
    const exportPayload = {
      personal_data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || null,
        created_at: user.created_at
      },
      export_date: new Date().toISOString()
    };

    return response.json(exportPayload);
  }
}