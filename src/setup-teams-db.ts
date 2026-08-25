import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco pelo Node.js...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Equipes (teams)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          organization_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('⏳ Criando tabela de Membros da Equipe (team_members)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
          team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          assignment VARCHAR(255) NOT NULL,
          PRIMARY KEY (team_id, user_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Tabelas de equipes criadas!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar tabelas de equipes:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();
