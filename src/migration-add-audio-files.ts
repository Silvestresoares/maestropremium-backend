import { pool } from './config/database';

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migração: Adicionando coluna audio_files na tabela songs...');

    await client.query(`
      ALTER TABLE songs
      ADD COLUMN IF NOT EXISTS audio_files JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Migração concluída: Coluna audio_files adicionada com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    client.release();
    pool.end();
  }
}

executeMigration();
