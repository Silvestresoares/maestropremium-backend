import { pool } from '../../../config/database';

interface ICreateEventDTO {
  title: string;
  description: string;
  date_time: Date;
  organization_id?: string;
}

export class EventsRepository {
  // Método para criar um evento
  async create({ title, description, date_time, organization_id }: ICreateEventDTO) {
    if (!organization_id) throw new Error('organization_id is required');
    const query = `
      INSERT INTO events (title, description, date_time, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, description, date_time, organization_id];
    
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Método para listar os eventos
  async list(organization_id: string) {
    const query = `
      SELECT 
        e.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', s.id,
                'title', s.title,
                'artist', s.artist,
                'original_key', s.tone,
                'tone', es.tone,
                'capo', es.capo,
                'position', es.position
              ) ORDER BY es.position ASC
            )
            FROM event_songs es
            JOIN songs s ON es.song_id = s.id
            WHERE es.event_id = e.id
          ), 
          '[]'::json
        ) AS songs,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', u.id,
                'name', u.name,
                'assignment', et.assignment
              )
            )
            FROM event_team et
            JOIN users u ON et.user_id = u.id
            WHERE et.event_id = e.id
          ),
          '[]'::json
        ) AS team
      FROM events e
      WHERE e.organization_id = $1
      ORDER BY e.date_time ASC;
    `;
    
    const { rows } = await pool.query(query, [organization_id]);
    return rows;
  }

  // Método para buscar um evento específico pelo ID
  async findById(id: string, organization_id: string) {
    const query = `
      SELECT 
        e.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', s.id,
                'title', s.title,
                'artist', s.artist,
                'original_key', s.tone,
                'tone', es.tone,
                'capo', es.capo,
                'position', es.position
              ) ORDER BY es.position ASC
            )
            FROM event_songs es
            JOIN songs s ON es.song_id = s.id
            WHERE es.event_id = e.id
          ), 
          '[]'::json
        ) AS songs,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', u.id,
                'name', u.name,
                'assignment', et.assignment
              )
            )
            FROM event_team et
            JOIN users u ON et.user_id = u.id
            WHERE et.event_id = e.id
          ),
          '[]'::json
        ) AS team
      FROM events e
      WHERE e.id = $1 AND e.organization_id = $2;
    `;
    
    
    const { rows } = await pool.query(query, [id, organization_id]);
    
    // Retorna o evento encontrado ou undefined se não existir
    return rows[0];
  }
  // Método para deletar um evento pelo ID
  async delete(id: string, organization_id: string) {
    const query = `
      DELETE FROM events 
      WHERE id = $1 AND organization_id = $2;
    `;
    
    await pool.query(query, [id, organization_id]);
  }
  // Método para atualizar um evento existente
  async update(id: string, { title, description, date_time, organization_id }: ICreateEventDTO) {
    if (!organization_id) throw new Error('organization_id is required');
    const query = `
      UPDATE events 
      SET title = $1, description = $2, date_time = $3 
      WHERE id = $4 AND organization_id = $5
      RETURNING *;
    `;
    const values = [title, description, date_time, id, organization_id];
    
    const { rows } = await pool.query(query, values);
    return rows[0]; // Retorna o evento já atualizado
  }
}