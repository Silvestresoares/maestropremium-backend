import { pool } from '../../../config/database';

export class EventAttachmentsRepository {
  async addAttachment(event_id: string, name: string, url: string, type: string, organization_id: string) {
    const query = `
      INSERT INTO event_attachments (event_id, name, url, type, organization_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [event_id, name, url, type, organization_id];
    
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async removeAttachment(id: string, event_id: string, organization_id: string) {
    const query = `
      DELETE FROM event_attachments 
      WHERE id = $1 AND event_id = $2 AND organization_id = $3
      RETURNING *;
    `;
    
    const { rows } = await pool.query(query, [id, event_id, organization_id]);
    return rows[0];
  }

  async findById(id: string, organization_id: string) {
    const query = `
      SELECT * FROM event_attachments
      WHERE id = $1 AND organization_id = $2;
    `;
    const { rows } = await pool.query(query, [id, organization_id]);
    return rows[0];
  }
}
