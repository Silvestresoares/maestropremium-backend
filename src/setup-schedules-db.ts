import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco pelo Node.js...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Escalas (schedules)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'pendente',
          justification TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Tabela de escalas (schedules) criada no banco!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao criar tabela de escalas:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();
