import { hash } from 'bcryptjs'; // Importação nova
import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';
import { CreateUserRawData } from '../schemas/createUser.schema';
import crypto from 'crypto';
import { pool } from '../../../config/database';
import { mailProvider } from '../../../shared/providers/MailProvider';

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

    const isInvite = !password;
    
    // Se não forneceu senha (convite), geramos uma aleatória só para cumprir o NOT NULL do banco
    const effectivePassword = password || crypto.randomBytes(32).toString('hex');

    // 1. Gerar o hash da senha (o número 8 é o fator de custo, balanceando segurança e velocidade)
    const passwordHash = await hash(effectivePassword, 8);

    // 2. Salvar o usuário usando o hash no lugar da senha original
    const user = await this.usersRepository.create({ 
      name, 
      email, 
      password_hash: passwordHash,
      organization_id,
      role
    });

    if (isInvite) {
      const inviteToken = crypto.randomBytes(32).toString('hex');
      
      let tenantName = '';
      const client = await pool.connect();
      try {
        await client.query(
          "UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '48 hours' WHERE id = $2",
          [inviteToken, user.id]
        );
        
        if (organization_id) {
          const res = await client.query('SELECT name FROM tenants WHERE id = $1', [organization_id]);
          if (res.rows.length > 0) {
            tenantName = res.rows[0].name;
          }
        }
      } finally {
        client.release();
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteLink = `${frontendUrl}/reset-password?token=${inviteToken}&invite=true`;

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá, ${user.name}!</h2>
          <p>Você foi convidado para participar da equipe ${tenantName ? `<strong>${tenantName}</strong> ` : ''}no Tom & Ordem.</p>
          <p>Clique no botão abaixo para definir sua senha inicial e acessar o sistema:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Definir Minha Senha</a>
          </div>
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${inviteLink}</p>
          <p style="margin-top: 40px; font-size: 14px; color: #9ca3af;">O link expira em 48 horas.</p>
        </div>
      `;

      await mailProvider.sendMail({
        to: email,
        subject: tenantName ? `Convite para a equipe ${tenantName} - Tom & Ordem` : 'Convite para a equipe - Tom & Ordem',
        body: emailBody,
        fromName: tenantName ? `Tom & Ordem - ${tenantName}` : 'Tom & Ordem'
      });
    }

    return user;
  }
}