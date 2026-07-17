import { hash } from 'bcryptjs';
import { pool } from '../../../config/database';
import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';
import { sign } from 'jsonwebtoken';

interface RegisterTenantRequest {
  name: string;
  email: string;
  password?: string;
  organizationName: string;
}

export class RegisterTenantService {
  async execute({ name, email, password, organizationName }: RegisterTenantRequest) {
    if (!name || !email || !password || !organizationName) {
      throw new AppError('Todos os campos são obrigatórios.', 400);
    }

    const client = await pool.connect();
    let user;
    let newOrganizationId;

    try {
      await client.query('BEGIN');

      const usersRepo = new UsersRepository();
      const existingUser = await usersRepo.findByEmail(email);
      let userId;

      if (existingUser) {
        // Usuário já existe, vamos apenas aproveitar a conta
        userId = existingUser.id;
      } else {
        // Criar novo usuário
        const passwordHash = await hash(password, 8);
        const userResult = await client.query(`
          INSERT INTO users (name, email, password_hash)
          VALUES ($1, $2, $3)
          RETURNING id, name, email;
        `, [name, email, passwordHash]);
        userId = userResult.rows[0].id;
        user = userResult.rows[0];
      }

      // Criar a Organização
      const orgResult = await client.query(`
        INSERT INTO organizations (name)
        VALUES ($1)
        RETURNING id, name;
      `, [organizationName]);
      newOrganizationId = orgResult.rows[0].id;

      // Vincular o usuário à organização como ADMIN
      await client.query(`
        INSERT INTO organization_users (user_id, organization_id, role)
        VALUES ($1, $2, $3)
      `, [userId, newOrganizationId, 'admin']);

      await client.query('COMMIT');

      // Se o usuário já existia, pegamos os dados para retornar
      if (existingUser) {
        user = {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email
        };
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      throw new AppError('Erro ao registrar nova organização.', 500);
    } finally {
      client.release();
    }

    // Já devolve o token para ele entrar logado direto
    const secret = process.env.JWT_SECRET || 'default-secret';
    const token = sign({ 
      role: 'admin', 
      organization_id: newOrganizationId 
    }, secret, {
      subject: user.id.toString(),
      expiresIn: '1d',
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        organization_id: newOrganizationId
      },
      token
    };
  }
}
