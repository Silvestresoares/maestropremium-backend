import { pool } from './config/database';

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migração: Adicionando coluna sheet_music_files na tabela songs...');

    await client.query(`
      ALTER TABLE songs
      ADD COLUMN IF NOT EXISTS sheet_music_files JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Migração concluída: Coluna sheet_music_files adicionada com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    client.release();
    pool.end();
  }
}

executeMigration();
