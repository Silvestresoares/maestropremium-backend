import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { AsaasService } from '../services/AsaasService';
import { AppError } from '../../../shared/errors/AppError';

const PLANS = {
  MONTHLY: { name: 'Mensal', value: 19.90, cycle: 'MONTHLY' as const },
  QUARTERLY: { name: 'Trimestral', value: 49.90, cycle: 'QUARTERLY' as const },
  SEMIANNUALLY: { name: 'Semestral', value: 89.90, cycle: 'SEMIANNUALLY' as const },
  YEARLY: { name: 'Anual', value: 149.90, cycle: 'YEARLY' as const }
};

export class BillingController {
  async getPlans(req: Request, res: Response) {
    return res.json(Object.keys(PLANS).map(key => ({
      id: key,
      ...PLANS[key as keyof typeof PLANS]
    })));
  }

  async getSubscriptionStatus(req: Request, res: Response) {
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT subscription_status, subscription_plan, subscription_expires_at FROM organizations WHERE id = $1',
        [organization_id]
      );

      if (!rows.length) {
        throw new AppError('Organização não encontrada', 404);
      }

      return res.json(rows[0]);
    } finally {
      client.release();
    }
  }

  async subscribe(req: Request, res: Response) {
    const { organization_id, id: userId } = req.user; 
    const { planId, billingType, cpfCnpj } = req.body;

    if (!PLANS[planId as keyof typeof PLANS]) {
      throw new AppError('Plano inválido', 400);
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    const asaas = new AsaasService();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: userRows } = await client.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const { name, email } = userRows[0];

      // Check if organization already has an Asaas customer ID
      const { rows } = await client.query('SELECT asaas_customer_id FROM organizations WHERE id = $1', [organization_id]);
      let customerId = rows[0]?.asaas_customer_id;

      if (!customerId) {
        const customer = await asaas.createCustomer({ name, email, cpfCnpj });
        customerId = customer.id;
        await client.query('UPDATE organizations SET asaas_customer_id = $1 WHERE id = $2', [customerId, organization_id]);
      }

      // Calculate next due date (today)
      const nextDueDate = new Date().toISOString().split('T')[0];

      // Recurring subscription
      const sub = await asaas.createSubscription({
        customer: customerId,
        billingType: billingType || 'PIX',
        value: plan.value,
        nextDueDate,
        cycle: plan.cycle,
        description: `Assinatura Maestro Premium - Plano ${plan.name}`
      });
      
      const subscriptionId = sub.id;
      await client.query(
        'UPDATE organizations SET asaas_subscription_id = $1, subscription_plan = $2 WHERE id = $3',
        [subscriptionId, plan.name, organization_id]
      );

      await client.query('COMMIT');
      return res.json(sub);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPixQrCode(req: Request, res: Response) {
    const { paymentId } = req.params;
    const asaas = new AsaasService();

    let idToUse = paymentId;

    // Se recebemos um ID de assinatura (sub_), buscamos o primeiro pagamento gerado para ela
    if (paymentId.startsWith('sub_')) {
      const payments = await asaas.getPaymentsBySubscription(paymentId);
      if (payments.data && payments.data.length > 0) {
        // Pega o pagamento mais recente / primeiro pagamento
        idToUse = payments.data[0].id;
      } else {
        throw new AppError('Nenhum pagamento encontrado para esta assinatura.', 404);
      }
    }

    const qrCode = await asaas.getPaymentPixQrCode(idToUse);
    return res.json(qrCode);
  }
}
