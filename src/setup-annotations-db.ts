import { pool } from './config/database';

async function setupAnnotationsDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando criação da tabela song_annotations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS song_annotations (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, song_id)
      );
    `);

    console.log('✅ Tabela "song_annotations" criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela song_annotations:', error);
  } finally {
    client.release();
    pool.end();
  }
}

setupAnnotationsDatabase();
