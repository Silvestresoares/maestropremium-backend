import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco pelo Node.js...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Usuários...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'musician',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Tabela de usuários criada no banco correto!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao criar tabela de usuários:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();