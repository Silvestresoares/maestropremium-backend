import { Request, Response } from 'express';
import { pool } from '../../../config/database';

export class WebhookController {
  async handleAsaasWebhook(req: Request, res: Response) {
    const asaasToken = req.headers['asaas-access-token'];
    const expectedTokenProd = process.env.ASAAS_WEBHOOK_TOKEN;
    const expectedTokenTest = process.env.ASAAS_WEBHOOK_TOKEN_TEST;

    // Se a API exige tokens, mas nenhum dos dois bate com o token recebido
    if ((expectedTokenProd || expectedTokenTest) && asaasToken !== expectedTokenProd && asaasToken !== expectedTokenTest) {
      return res.status(401).send('Unauthorized Webhook');
    }

    const { event, payment } = req.body;
    
    // We expect events like PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
    if (!payment || !payment.customer) {
      return res.status(400).send('Bad Request');
    }

    const customerId = payment.customer;
    const client = await pool.connect();

    try {
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        // Payment successful
        let query = '';
        let values = [];

        if (payment.subscription) {
          // Buscamos o plano da organização para calcular a validade corretamente
          const { rows } = await client.query('SELECT subscription_plan FROM organizations WHERE asaas_customer_id = $1', [customerId]);
          const planName = rows[0]?.subscription_plan || 'Mensal';
          
          let intervalStr = '30 days';
          if (planName === 'Trimestral') intervalStr = '3 months';
          else if (planName === 'Semestral') intervalStr = '6 months';
          else if (planName === 'Anual') intervalStr = '1 year';

          // It's a recurring payment
          query = `
            UPDATE organizations 
            SET subscription_status = 'ACTIVE', subscription_expires_at = CURRENT_TIMESTAMP + INTERVAL '${intervalStr}'
            WHERE asaas_customer_id = $1
          `;
          values = [customerId];
        } else {
          // It's a lifetime payment (no subscription ID associated with the payment usually, or we can check the plan name)
          query = `
            UPDATE organizations 
            SET subscription_status = 'ACTIVE', subscription_expires_at = '2099-12-31'
            WHERE asaas_customer_id = $1
          `;
          values = [customerId];
        }

        await client.query(query, values);
      } 
      else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED') {
        // Payment failed or revoked
        await client.query(`
          UPDATE organizations 
          SET subscription_status = 'INACTIVE'
          WHERE asaas_customer_id = $1
        `, [customerId]);
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).send('Internal Server Error');
    } finally {
      client.release();
    }
  }
}
