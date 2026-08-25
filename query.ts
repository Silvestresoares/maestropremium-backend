import { pool } from './src/config/database';

async function run() {
  try {
    const { rows } = await pool.query("SELECT id, title, sheet_music_files FROM songs WHERE jsonb_array_length(sheet_music_files) > 0 LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error("SQL ERROR:", e);
  }
  process.exit(0);
}
run().catch(console.error);
