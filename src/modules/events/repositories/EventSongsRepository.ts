import { pool } from '../../../config/database';

export class EventSongsRepository {
  async addSong(eventId: string, songId: string) {
    // Determine the next position
    const positionQuery = `
      SELECT COALESCE(MAX(position), 0) + 1 AS next_position 
      FROM event_songs 
      WHERE event_id = $1;
    `;
    const { rows: posRows } = await pool.query(positionQuery, [eventId]);
    const nextPosition = posRows[0].next_position;

    const query = `
      INSERT INTO event_songs (event_id, song_id, position)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [eventId, songId, nextPosition]);
    return rows[0];
  }

  async removeSong(eventId: string, songId: string) {
    const query = `
      DELETE FROM event_songs 
      WHERE event_id = $1 AND song_id = $2;
    `;
    await pool.query(query, [eventId, songId]);
  }

  async reorderSongs(eventId: string, songIdsInOrder: string[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < songIdsInOrder.length; i++) {
        const songId = songIdsInOrder[i];
        const newPosition = i + 1; // 1-indexed

        const query = `
          UPDATE event_songs 
          SET position = $1 
          WHERE event_id = $2 AND song_id = $3;
        `;
        await client.query(query, [newPosition, eventId, songId]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
