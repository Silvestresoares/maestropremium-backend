import { pool } from '../../../config/database';

export interface SongAnnotationRow {
  id: number;
  user_id: string;
  song_id: string;
  event_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export class SongAnnotationsRepository {
  async findByUserAndSong(userId: string, songId: string, eventId: string): Promise<SongAnnotationRow | null> {
    const query = 'SELECT * FROM song_annotations WHERE user_id = $1 AND song_id = $2 AND event_id = $3;';
    const result = await pool.query(query, [userId, songId, eventId]);
    return result.rows[0] || null;
  }

  async upsert(userId: string, songId: string, eventId: string, content: string): Promise<SongAnnotationRow> {
    const query = `
      INSERT INTO song_annotations (user_id, song_id, event_id, content)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, song_id, event_id) 
      DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, songId, eventId, content]);
    return result.rows[0];
  }
}
