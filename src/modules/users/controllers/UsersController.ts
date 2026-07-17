import { Request, Response } from 'express';
import { CreateUserService } from '../services/CreateUserService';
import { RegisterTenantService } from '../services/RegisterTenantService';
import { ListUsersService } from '../services/ListUsersService';
import { UpdateUserRoleService } from '../services/UpdateUserRoleService';
import { UpdateUserService } from '../services/UpdateUserService';
import { DeleteUserService } from '../services/DeleteUserService';
import { createUserSchema } from '../schemas/createUser.schema';

export class UsersController {
  async register(request: Request, response: Response): Promise<Response> {
    const { name, email, password, organizationName } = request.body;
    
    const registerTenantService = new RegisterTenantService();
    const result = await registerTenantService.execute({ name, email, password, organizationName });

    return response.status(201).json(result);
  }

  async create(request: Request, response: Response): Promise<Response> {
    // Validação estrita do payload recebido. Se falhar, o Zod lança um erro
    // que é tratado pelo nosso middleware errorHandler automaticamente.
    const validatedData = createUserSchema.parse(request.body);

    const currentUser = (request as any).user;
    const createUserService = new CreateUserService();
    const user = await createUserService.execute(validatedData, currentUser?.organization_id);

    // Retorna o usuário criado com o status HTTP 21 (Created)
    return response.status(201).json(user);
  }

  async index(request: Request, response: Response): Promise<Response> {
    const currentUser = (request as any).user;
    const listUsersService = new ListUsersService();
    const users = await listUsersService.execute(currentUser?.organization_id);

    return response.json(users);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { name, email } = request.body;

    const updateUserService = new UpdateUserService();
    const user = await updateUserService.execute(Number(id), name, email);

    return response.json(user);
  }

  async updateRole(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { role } = request.body;
    const currentUser = (request as any).user;

    const updateUserRoleService = new UpdateUserRoleService();
    const user = await updateUserRoleService.execute(Number(id), role, currentUser?.organization_id);

    return response.json(user);
  }

  async delete(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;

    // Previne que o administrador se delete acidentalmente
    const currentUser = (request as any).user;
    if (currentUser.id == id) {
      return response.status(400).json({ error: 'Você não pode deletar a si mesmo.' });
    }

    const deleteUserService = new DeleteUserService();
    await deleteUserService.execute(Number(id), currentUser?.organization_id);

    return response.status(204).send();
  }
}