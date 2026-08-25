import { pool } from './config/database';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Dropando a tabela song_annotations antiga...');
    await client.query(`DROP TABLE IF EXISTS song_annotations;`);

    console.log('Criando a nova tabela song_annotations com event_id...');
    await client.query(`
      CREATE TABLE song_annotations (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, song_id, event_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
