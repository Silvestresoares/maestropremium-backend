import { pool } from '../../../config/database';
import { CreateSkillRawData } from '../schemas/createSkill.schema';

export class SkillsRepository {
  async create({ name }: CreateSkillRawData) {
    const text = `
      INSERT INTO skills (name)
      VALUES ($1)
      RETURNING *
    `;
    const values = [name];
    
    const result = await pool.query(text, values);
    return result.rows[0];
  }

  async list() {
    const text = `SELECT * FROM skills ORDER BY name ASC`;
    const result = await pool.query(text);
    return result.rows;
  }

  async findById(id: string) {
    const text = `SELECT * FROM skills WHERE id = $1`;
    const values = [id];
    
    const result = await pool.query(text, values);
    return result.rows[0];
  }

  async update(id: string, { name }: CreateSkillRawData) {
    const text = `
      UPDATE skills
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const values = [name, id];

    const result = await pool.query(text, values);
    return result.rows[0];
  }

  async delete(id: string) {
    const text = `DELETE FROM skills WHERE id = $1`;
    const values = [id];

    await pool.query(text, values);
  }
}
