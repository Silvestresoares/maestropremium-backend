import { pool } from '../../../config/database';

export interface SongAnnotationRow {
  id: number;
  user_id: string;
  song_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export class SongAnnotationsRepository {
  async findByUserAndSong(userId: string, songId: string): Promise<SongAnnotationRow | null> {
    const query = 'SELECT * FROM song_annotations WHERE user_id = $1 AND song_id = $2;';
    const result = await pool.query(query, [userId, songId]);
    return result.rows[0] || null;
  }

  async upsert(userId: string, songId: string, content: string): Promise<SongAnnotationRow> {
    const query = `
      INSERT INTO song_annotations (user_id, song_id, content)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, song_id) 
      DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, songId, content]);
    return result.rows[0];
  }
}
