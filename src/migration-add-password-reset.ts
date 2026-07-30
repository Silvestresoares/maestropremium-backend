import { pool } from './config/database';

async function runMigration() {
  console.log('⏳ Iniciando migração: Adicionando tokens de recuperação de senha...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Adiciona as colunas reset_token e reset_token_expires à tabela users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Colunas reset_token e reset_token_expires adicionadas à tabela users!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
