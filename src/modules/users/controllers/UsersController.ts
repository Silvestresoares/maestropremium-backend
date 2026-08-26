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
    const { name, email, password, organizationName, acceptedTerms, isAdult } = request.body;
    
    // Captura o IP para registro do consentimento LGPD
    const ipAddress = request.ip || request.connection.remoteAddress || '0.0.0.0';

    const registerTenantService = new RegisterTenantService();
    const result = await registerTenantService.execute({ name, email, password, organizationName, acceptedTerms, isAdult, ipAddress });

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

  // LGPD: Registrar consentimento
  async submitConsent(request: Request, response: Response): Promise<Response> {
    const currentUser = request.user;
    if (!currentUser?.id) {
      return response.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const ipAddress = request.ip || request.connection.remoteAddress || '0.0.0.0';

    const { pool } = await import('../../../config/database');
    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO user_consents (user_id, document_version, ip_address)
        VALUES ($1, 'v1.0', $2)
      `, [currentUser.id, ipAddress]);
    } catch (error) {
      console.error('Erro ao salvar consentimento:', error);
      return response.status(500).json({ error: 'Erro ao salvar consentimento.' });
    } finally {
      client.release();
    }

    return response.status(201).send();
  }

  // LGPD ADMIN: Exportação de dados por e-mail
  async exportDataByEmail(request: Request, response: Response): Promise<Response> {
    const { email } = request.params;
    
    const { UsersRepository } = await import('../repositories/UsersRepository');
    const usersRepository = new UsersRepository();
    const user = await usersRepository.findByEmail(email);

    if (!user) {
      return response.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Exemplo de exportação
    const exportPayload = {
      personal_data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || null
      },
      export_date: new Date().toISOString(),
      requested_by_admin: request.user?.id
    };

    return response.json(exportPayload);
  }

  // LGPD ADMIN: Anonimização de dados por e-mail (Direito ao esquecimento)
  async anonymizeDataByEmail(request: Request, response: Response): Promise<Response> {
    const { email } = request.params;

    const { UsersRepository } = await import('../repositories/UsersRepository');
    const usersRepository = new UsersRepository();
    const user = await usersRepository.findByEmail(email);

    if (!user) {
      return response.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { pool } = await import('../../../config/database');
    const client = await pool.connect();

    try {
      const { CryptoService } = await import('../../../shared/utils/CryptoService');
      const anonEmail = `excluido_${user.id}@anonymized.com`;
      const anonName = 'Usuário Excluído';
      
      const emailHash = CryptoService.generateBlindIndex(anonEmail);
      const encEmail = CryptoService.encrypt(anonEmail);
      const encName = CryptoService.encrypt(anonName);

      await client.query('BEGIN');
      
      // Update the user to anonymize data
      await client.query(`
        UPDATE users 
        SET 
          name = $1,
          email = $2,
          email_hash = $3,
          password_hash = 'INVALIDATED'
        WHERE id = $4
      `, [encName, encEmail, emailHash, user.id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao anonimizar usuário:', error);
      return response.status(500).json({ error: 'Erro interno ao anonimizar usuário.' });
    } finally {
      client.release();
    }

    return response.status(204).send();
  }
}