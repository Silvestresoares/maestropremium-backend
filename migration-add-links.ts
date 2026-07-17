import { pool } from './src/config/database';

async function runMigration() {
  console.log('⏳ Executando migração para adicionar links na tabela songs...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE songs 
      ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS spotify_url VARCHAR(255);
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Colunas youtube_url e spotify_url adicionadas!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao rodar migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
