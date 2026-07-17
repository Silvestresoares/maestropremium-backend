import { pool } from './src/config/database';

async function check() {
  const tables = ['users', 'skills'];
  for (const t of tables) {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
    console.log(`Table ${t}:`);
    console.log(res.rows);
  }
  pool.end();
}

check();
