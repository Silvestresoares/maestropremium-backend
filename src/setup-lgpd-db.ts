import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco para tabelas LGPD...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Consentimentos (user_consents)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          document_version VARCHAR(50) NOT NULL,
          ip_address VARCHAR(45),
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('⏳ Criando tabela de Auditoria (audit_logs)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Tabelas de LGPD criadas com sucesso no banco!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao criar tabelas LGPD:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();
