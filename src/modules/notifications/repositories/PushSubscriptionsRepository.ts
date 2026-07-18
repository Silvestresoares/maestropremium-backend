import { pool } from '../../../config/database';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  organization_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date;
}

export class PushSubscriptionsRepository {
  async save({ user_id, organization_id, endpoint, p256dh, auth }: { user_id: string; organization_id: string; endpoint: string; p256dh: string; auth: string }): Promise<PushSubscriptionRow> {
    const query = `
      INSERT INTO push_subscriptions (user_id, organization_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) DO UPDATE 
      SET user_id = EXCLUDED.user_id,
          organization_id = EXCLUDED.organization_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth
      RETURNING *;
    `;
    const result = await pool.query(query, [user_id, organization_id, endpoint, p256dh, auth]);
    return result.rows[0];
  }

  async findByOrganization(organization_id: string): Promise<PushSubscriptionRow[]> {
    const query = 'SELECT * FROM push_subscriptions WHERE organization_id = $1;';
    const result = await pool.query(query, [organization_id]);
    return result.rows;
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const query = 'DELETE FROM push_subscriptions WHERE endpoint = $1;';
    await pool.query(query, [endpoint]);
  }
}
