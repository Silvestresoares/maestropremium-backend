import { pool } from '../../../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/errors/AppError';

export class ResetPasswordService {
  async execute(token: string, newPassword: string): Promise<void> {
    const client = await pool.connect();
    try {
      // 1. Busca o usuário que tenha este token e que não esteja expirado
      const result = await client.query(
        'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Token inválido ou expirado.', 400);
      }

      const userId = result.rows[0].id;

      // 2. Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 3. Atualiza a senha e invalida o token
      await client.query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
        [hashedPassword, userId]
      );
    } finally {
      client.release();
    }
  }
}
