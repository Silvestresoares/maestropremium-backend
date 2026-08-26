import { pool } from '../../../config/database';
import { mailProvider } from '../../../shared/providers/MailProvider';
import crypto from 'crypto';

export class ForgotPasswordService {
  async execute(email: string): Promise<void> {
    const client = await pool.connect();
    try {
      const { CryptoService } = await import('../../../shared/utils/CryptoService');
      const emailHash = CryptoService.generateBlindIndex(email);
      
      // 1. Verifica se o usuário existe
      const userResult = await client.query('SELECT id, name FROM users WHERE email_hash = $1', [emailHash]);
      
      if (userResult.rows.length === 0) {
        // Retornamos silenciosamente para evitar "email enumeration attacks"
        return;
      }
      const user = userResult.rows[0];
      user.name = CryptoService.decrypt(user.name);

      // 2. Gera um token criptograficamente seguro
      const token = crypto.randomBytes(32).toString('hex');
      
      // 3 e 4. Salva o token no banco com expiração segura via banco (1 hora)
      await client.query(
        "UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = $2",
        [token, user.id]
      );

      // 5. Envia o e-mail
      // Usamos a variável de ambiente VITE_API_URL ou fallback para local
      // O link do frontend será na mesma origem que acessar, mas geralmente 5173 localmente
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá, ${user.name}!</h2>
          <p>Você solicitou a recuperação de senha para sua conta no Tom & Ordem.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetLink}</p>
          <p style="margin-top: 40px; font-size: 14px; color: #9ca3af;">Se você não solicitou isso, pode ignorar este e-mail em segurança. O link expira em 1 hora.</p>
        </div>
      `;

      await mailProvider.sendMail({
        to: email,
        subject: 'Tom & Ordem - Recuperação de Senha',
        body: emailBody,
        fromName: 'Tom & Ordem'
      });

    } finally {
      client.release();
    }
  }
}
