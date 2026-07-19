import { pool } from '../../../config/database';

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  tone: string;
  bpm: number;
  file_url: string;
  youtube_url?: string;
  spotify_url?: string;
  chord_pro: string;
  time_signature?: string;
  audio_files?: any[];
  created_at: Date;
}

export class SongsRepository {
  async findAll(organization_id: string): Promise<SongRow[]> {
    const query = 'SELECT id, title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, audio_files, created_at FROM songs WHERE organization_id = $1 ORDER BY title ASC;';
    const result = await pool.query(query, [organization_id]);
    return result.rows;
  }

  async findById(id: string, organization_id: string): Promise<SongRow | null> {
    const query = 'SELECT id, title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, audio_files, created_at FROM songs WHERE id = $1 AND organization_id = $2;';
    const result = await pool.query(query, [id, organization_id]);
    return result.rows[0] || null;
  }

  async create({ title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, organization_id }: { title: string; artist: string; tone: string; bpm: number; file_url: string; youtube_url?: string; spotify_url?: string; chord_pro?: string; time_signature?: string; organization_id: string }): Promise<SongRow> {
    const query = `
      INSERT INTO songs (title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, audio_files, created_at;
    `;
    const result = await pool.query(query, [title, artist, tone, bpm, file_url, youtube_url || null, spotify_url || null, chord_pro || null, time_signature || null, organization_id]);
    return result.rows[0];
  }

  async update({ id, title, artist, tone, bpm, youtube_url, spotify_url, chord_pro, time_signature, organization_id }: { id: string; title: string; artist: string; tone: string; bpm: number; youtube_url?: string; spotify_url?: string; chord_pro?: string; time_signature?: string; organization_id: string }): Promise<SongRow> {
    const query = `
      UPDATE songs 
      SET title = $1, artist = $2, tone = $3, bpm = $4, youtube_url = $5, spotify_url = $6, chord_pro = $7, time_signature = $8
      WHERE id = $9 AND organization_id = $10
      RETURNING id, title, artist, tone, bpm, file_url, youtube_url, spotify_url, chord_pro, time_signature, audio_files, created_at;
    `;
    const result = await pool.query(query, [title, artist, tone, bpm, youtube_url || null, spotify_url || null, chord_pro || null, time_signature || null, id, organization_id]);
    return result.rows[0];
  }

  async delete(id: string, organization_id: string): Promise<void> {
    const query = 'DELETE FROM songs WHERE id = $1 AND organization_id = $2;';
    await pool.query(query, [id, organization_id]);
  }

  async updateAudioFiles(id: string, organization_id: string, audio_files: any[]): Promise<void> {
    const query = 'UPDATE songs SET audio_files = $1 WHERE id = $2 AND organization_id = $3;';
    await pool.query(query, [JSON.stringify(audio_files), id, organization_id]);
  }
}
