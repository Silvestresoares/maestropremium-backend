import { pool } from './src/config/database';

async function run() {
  try {
    const { rows } = await pool.query('SELECT * FROM songs LIMIT 1');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error("SQL ERROR:", e);
  }
  process.exit(0);
}
run().catch(console.error);
