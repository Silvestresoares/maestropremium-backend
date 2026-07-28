import { Request, Response } from 'express';
import { pool } from '../../../config/database';

export class SuperAdminController {
  
  async getDashboardStats(req: Request, res: Response) {
    const client = await pool.connect();
    try {
      // MRR Calculation (Sum of values of ACTIVE subscriptions)
      // Since we don't have a plan value column in organizations, we'll assume a fixed average or count them.
      // Wait, let's just show total active subscriptions for now.
      const statsQuery = `
        SELECT 
          COUNT(*) as total_organizations,
          SUM(CASE WHEN subscription_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_subscriptions,
          SUM(CASE WHEN subscription_status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive_subscriptions
        FROM organizations;
      `;
      const statsResult = await client.query(statsQuery);
      
      const totalOrganizations = parseInt(statsResult.rows[0].total_organizations) || 0;
      const activeSubscriptions = parseInt(statsResult.rows[0].active_subscriptions) || 0;
      const inactiveSubscriptions = parseInt(statsResult.rows[0].inactive_subscriptions) || 0;

      // MRR is estimated (e.g. 19.90 * active) for simplicity, or we can fetch exact from Asaas.
      // We will provide a simple estimate based on the lowest plan (19.90) for illustration, 
      // since exact billing info is in Asaas.
      const estimatedMRR = activeSubscriptions * 19.90;

      return res.json({
        totalOrganizations,
        activeSubscriptions,
        inactiveSubscriptions,
        estimatedMRR
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  async getOrganizations(req: Request, res: Response) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          o.id,
          o.name as organization_name,
          o.subscription_status,
          o.created_at,
          u.name as owner_name,
          u.email as owner_email,
          u.phone as owner_phone
        FROM organizations o
        LEFT JOIN organization_users ou ON ou.organization_id = o.id AND ou.role = 'admin'
        LEFT JOIN users u ON u.id = ou.user_id
        ORDER BY o.created_at DESC;
      `;
      const result = await client.query(query);
      return res.json(result.rows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  async toggleSubscriptionStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'

    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const client = await pool.connect();
    try {
      const query = `
        UPDATE organizations 
        SET subscription_status = $1 
        WHERE id = $2 
        RETURNING id, name, subscription_status;
      `;
      const result = await client.query(query, [status, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Organização não encontrada.' });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
}
