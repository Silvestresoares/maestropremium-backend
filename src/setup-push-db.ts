import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco pelo Node.js...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Push Subscriptions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          organization_id VARCHAR(255) NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh VARCHAR(255) NOT NULL,
          auth VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(endpoint)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Tabela de push_subscriptions criada no banco!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao criar tabela de push_subscriptions:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();
