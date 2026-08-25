import { pool } from '../../../config/database'; // Ajuste o caminho se necessário

export interface EventSongRow {
  event_id: string;
  song_id: string;
  position: number;
}

export class SetlistsRepository {
  
  // Adiciona uma música ao evento
  async addSong(eventId: string, songId: string, position: number, tone?: string, capo?: number): Promise<EventSongRow> {
    const query = `
      INSERT INTO event_songs (event_id, song_id, position, tone, capo) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;
    const result = await pool.query(query, [eventId, songId, position, tone || null, capo || 0]);
    return result.rows[0];
  }

  // Atualiza tom e capo de uma música no evento
  async updateSong(eventId: string, songId: string, tone?: string, capo?: number): Promise<EventSongRow> {
    const query = `
      UPDATE event_songs 
      SET tone = $3, capo = $4 
      WHERE event_id = $1 AND song_id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [eventId, songId, tone || null, capo || 0]);
    return result.rows[0];
  }

  // Busca todas as músicas de um evento específico, já trazendo os dados da música e a cifra
  async getSetlistByEventId(eventId: string) {
    const query = `
      SELECT 
        es.position, 
        es.tone AS event_tone,
        es.capo AS event_capo,
        s.*, 
        s.chord_pro AS chordpro_content 
      FROM event_songs es 
      JOIN songs s ON es.song_id = s.id 
      WHERE es.event_id = $1 
      ORDER BY es.position ASC;
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }

  // Remove uma música do evento
  async removeSong(eventId: string, songId: string): Promise<void> {
    const query = `
      DELETE FROM event_songs 
      WHERE event_id = $1 AND song_id = $2;
    `;
    await pool.query(query, [eventId, songId]);
  }
}