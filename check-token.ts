import { pool } from './src/config/database';

async function check() {
  const client = await pool.connect();
  const res = await client.query('SELECT email, email_hash, reset_token, reset_token_expires FROM users WHERE reset_token IS NOT NULL');
  console.log(res.rows);
  client.release();
  process.exit(0);
}
check();
