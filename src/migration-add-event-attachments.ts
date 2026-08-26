import { pool } from './config/database';

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migração: Criando tabela event_attachments...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          url VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Migração concluída: Tabela event_attachments criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    client.release();
    pool.end();
  }
}

executeMigration();
