import { pool } from '../../../config/database';
import { CreateEventRawData, CreateScheduleRawData } from '../schemas/schedules.schema';

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date_time: Date;
  created_at: Date;
}

export interface ScheduleRow {
  id: string;
  event_id: string;
  user_id: number; // 👈 Atualizado para number
  skill_id: string;
  status: 'pendente' | 'confirmado' | 'recusado';
  justification: string | null;
  created_at: Date;
}

export class SchedulesRepository {
  // Cria um novo evento (Culto/Ensaio)
  async createEvent({ title, description, date_time }: CreateEventRawData): Promise<EventRow> {
    const query = `
      INSERT INTO events (title, description, date_time)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, date_time, created_at;
    `;
    const result = await pool.query(query, [title, description || null, date_time]);
    return result.rows[0];
  }

  // Verifica se o voluntário já está escalado naquela exata função para aquele evento
  // 🔽 Atualizado user_id para number aqui na assinatura
  async findDuplicate(event_id: string, user_id: number, skill_id: string): Promise<ScheduleRow | null> {
    const query = `
      SELECT id, event_id, user_id, skill_id, status, justification, created_at 
      FROM schedules 
      WHERE event_id = $1 AND user_id = $2 AND skill_id = $3;
    `;
    const result = await pool.query(query, [event_id, user_id, skill_id]);
    return result.rows[0] || null;
  }

  // Cria a escala do voluntário
  async createSchedule({ event_id, user_id, skill_id }: CreateScheduleRawData): Promise<ScheduleRow> {
    const query = `
      INSERT INTO schedules (event_id, user_id, skill_id)
      VALUES ($1, $2, $3)
      RETURNING id, event_id, user_id, skill_id, status, justification, created_at;
    `;
    const result = await pool.query(query, [event_id, user_id, skill_id]);
    return result.rows[0];
  }
}