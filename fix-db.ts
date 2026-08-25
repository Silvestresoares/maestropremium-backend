import { pool } from './src/config/database';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS original_key VARCHAR(10);');
    await client.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS chord_pro TEXT;');
    console.log('✅ Columns added successfully.');
  } catch (err) {
    console.error('❌ Error adding columns:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}
run();
