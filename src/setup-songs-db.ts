import { pool } from './config/database';

async function setupSongsDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando criação da tabela songs...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        tone VARCHAR(10) NOT NULL,
        bpm INTEGER,
        time_signature VARCHAR(10),
        file_url VARCHAR(255) NOT NULL,
        youtube_url VARCHAR(255),
        spotify_url VARCHAR(255),
        chord_pro TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabela "songs" criada com sucesso (ou já existia)!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela songs:', error);
  } finally {
    client.release();
    pool.end();
  }
}

setupSongsDatabase();
