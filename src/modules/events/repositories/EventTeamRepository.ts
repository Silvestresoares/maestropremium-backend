import { pool } from '../../../config/database';

export class EventTeamRepository {
  async addTeamMember(eventId: string, userId: string, assignment: string) {
    const query = `
      INSERT INTO event_team (event_id, user_id, assignment)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id, user_id) 
      DO UPDATE SET assignment = EXCLUDED.assignment
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [eventId, userId, assignment]);
    return rows[0];
  }

  async removeTeamMember(eventId: string, userId: string) {
    const query = `
      DELETE FROM event_team 
      WHERE event_id = $1 AND user_id = $2;
    `;
    await pool.query(query, [eventId, userId]);
  }
}
