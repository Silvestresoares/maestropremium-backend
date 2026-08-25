import { pool } from './config/database';

async function runMigration() {
  console.log('⏳ Adicionando colunas tone e capo na tabela event_songs...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Adiciona as colunas, ignorando se já existirem (embora PostgreSQL não tenha ADD COLUMN IF NOT EXISTS de forma simples para multiplas colunas, fazemos separadamente)
    await client.query(`
      ALTER TABLE event_songs ADD COLUMN IF NOT EXISTS tone VARCHAR(10);
      ALTER TABLE event_songs ADD COLUMN IF NOT EXISTS capo INTEGER DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Colunas tone e capo adicionadas em event_songs!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao rodar migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
