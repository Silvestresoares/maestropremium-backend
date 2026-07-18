import { pool } from '../../../config/database';

export interface TeamRow {
  id: string;
  name: string;
  organization_id: string;
  created_at: Date;
}

export interface TeamMemberRow {
  team_id: string;
  user_id: string;
  assignment: string;
  name?: string; // from join
}

export class TeamsRepository {
  async create(name: string, organization_id: string): Promise<TeamRow> {
    const query = `
      INSERT INTO teams (name, organization_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(query, [name, organization_id]);
    return result.rows[0];
  }

  async findAll(organization_id: string): Promise<TeamRow[]> {
    const query = 'SELECT * FROM teams WHERE organization_id = $1 ORDER BY name ASC;';
    const result = await pool.query(query, [organization_id]);
    return result.rows;
  }

  async findById(id: string, organization_id: string): Promise<TeamRow | null> {
    const query = 'SELECT * FROM teams WHERE id = $1 AND organization_id = $2;';
    const result = await pool.query(query, [id, organization_id]);
    return result.rows[0] || null;
  }

  async update(id: string, name: string, organization_id: string): Promise<TeamRow> {
    const query = `
      UPDATE teams
      SET name = $1
      WHERE id = $2 AND organization_id = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [name, id, organization_id]);
    return result.rows[0];
  }

  async delete(id: string, organization_id: string): Promise<void> {
    const query = 'DELETE FROM teams WHERE id = $1 AND organization_id = $2;';
    await pool.query(query, [id, organization_id]);
  }

  // --- Membros ---

  async addMember(team_id: string, user_id: string, assignment: string): Promise<void> {
    const query = `
      INSERT INTO team_members (team_id, user_id, assignment)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id) DO UPDATE 
      SET assignment = EXCLUDED.assignment;
    `;
    await pool.query(query, [team_id, user_id, assignment]);
  }

  async removeMember(team_id: string, user_id: string): Promise<void> {
    const query = 'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2;';
    await pool.query(query, [team_id, user_id]);
  }

  async getMembers(team_id: string): Promise<TeamMemberRow[]> {
    const query = `
      SELECT tm.team_id, tm.user_id, tm.assignment, u.name 
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1;
    `;
    const result = await pool.query(query, [team_id]);
    return result.rows;
  }
}
