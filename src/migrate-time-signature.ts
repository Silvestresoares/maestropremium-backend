import { pool } from './config/database';

async function migrateTimeSignature() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migration para adicionar time_signature...');

    await client.query(`
      ALTER TABLE songs ADD COLUMN IF NOT EXISTS time_signature VARCHAR(10);
    `);

    console.log('✅ Coluna "time_signature" criada com sucesso na tabela songs!');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna time_signature:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrateTimeSignature();
