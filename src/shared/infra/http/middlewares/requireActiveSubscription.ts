import { Request, Response, NextFunction } from 'express';
import { pool } from '../../../../config/database';
import { AppError } from '../../../errors/AppError';

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  // O usuário precisa estar autenticado (passar pelo isAuthenticated antes desse)
  const { organization_id, is_super_admin } = req.user as any;

  // Dono do sistema (Super Admin) nunca sofre bloqueio de pagamento
  if (is_super_admin) {
    return next();
  }

  if (!organization_id) {
    throw new AppError('Usuário não pertence a nenhuma organização.', 403);
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT subscription_status, subscription_expires_at FROM organizations WHERE id = $1',
      [organization_id]
    );

    if (!rows.length) {
      throw new AppError('Organização não encontrada.', 404);
    }

    const { subscription_status, subscription_expires_at } = rows[0];

    // Se estiver TRIAL, ACTIVE, ou se não expirou ainda
    const isActive = subscription_status === 'ACTIVE' || subscription_status === 'TRIAL';
    const isExpired = subscription_expires_at && new Date() > new Date(subscription_expires_at);

    if (!isActive || isExpired) {
      // Bloqueio
      throw new AppError('PAYMENT_REQUIRED', 402); // 402 Payment Required
    }

    return next();
  } finally {
    client.release();
  }
}
