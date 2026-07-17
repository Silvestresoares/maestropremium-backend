import { pool } from './src/config/database';

async function testInsert() {
  try {
    const orgQuery = await pool.query('SELECT id FROM organizations LIMIT 1');
    const orgId = orgQuery.rows[0]?.id;
    console.log('Org ID:', orgId);
    
    if (!orgId) throw new Error('No org found');

    const query = `
      INSERT INTO events (title, description, date_time, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = ['Test Event', 'Description', '2026-07-17T20:15', orgId];
    
    const { rows } = await pool.query(query, values);
    console.log('Inserted:', rows[0]);
  } catch (error) {
    console.error('Error inserting:', error);
  } finally {
    process.exit(0);
  }
}

testInsert();
