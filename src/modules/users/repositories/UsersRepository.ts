import { pool } from '../../../config/database';
import { CreateUserRawData } from '../schemas/createUser.schema';

export interface UserRow {
  id: number; // Certifique-se de que o tipo condiz com seu banco (uuid geralmente é string)
  name: string;
  email: string;
  password_hash: string; 
  role: string;
  created_at: Date;
  legacy_role?: string;
}

export class UsersRepository {
  
  async findByEmail(email: string): Promise<UserRow & { organization_id?: string; org_role?: string } | null> {
    const query = `
      SELECT u.id, u.name, u.email, u.password_hash, 
             ou.organization_id, ou.role as org_role, u.role as legacy_role
      FROM users u
      LEFT JOIN organization_users ou ON ou.user_id = u.id
      WHERE u.email = $1
      LIMIT 1;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }
  
  async findAll(organization_id?: string): Promise<Omit<UserRow, 'password_hash'>[]> {
    if (!organization_id) return []; // Retorna vazio se não tiver org, por segurança
    const query = `
      SELECT u.id, u.name, u.email, ou.role, u.created_at 
      FROM users u
      INNER JOIN organization_users ou ON ou.user_id = u.id
      WHERE ou.organization_id = $1
      ORDER BY u.created_at DESC;
    `;
    const result = await pool.query(query, [organization_id]);
    return result.rows;
  }
  
  async update(id: number, name: string, email: string): Promise<UserRow | null> {
    const query = 'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, created_at;';
    const result = await pool.query(query, [name, email, id]);
    return result.rows[0] || null;
  }
  
  async updateRole(id: number | string, role: string, organization_id?: string): Promise<UserRow | null> {
    if (!organization_id) return null;
    const query = 'UPDATE organization_users SET role = $1 WHERE user_id = $2 AND organization_id = $3 RETURNING role;';
    const result = await pool.query(query, [role, id, organization_id]);
    return result.rows[0] || null;
  }

  async delete(id: number | string, organization_id?: string): Promise<void> {
    if (!organization_id) return;
    // Remove the user from the organization
    const query = 'DELETE FROM organization_users WHERE user_id = $1 AND organization_id = $2;';
    await pool.query(query, [id, organization_id]);
  }
  
  // CORREÇÃO AQUI: Mudamos a assinatura para receber password_hash diretamente
  // CORREÇÃO AQUI: Mudamos a assinatura para receber password_hash diretamente
  async create({ name, email, password_hash, organization_id, role = 'musician' }: { name: string; email: string; password_hash: string; organization_id?: string; role?: string }): Promise<UserRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const queryUser = `
        INSERT INTO users (name, email, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING id, name, email, created_at;
      `;
      const result = await client.query(queryUser, [name, email, password_hash]);
      const user = result.rows[0];

      if (organization_id) {
        await client.query(`
          INSERT INTO organization_users (user_id, organization_id, role)
          VALUES ($1, $2, $3)
        `, [user.id, organization_id, role]);
      }

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}