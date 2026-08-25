import { pool } from './config/database';

async function runMigration() {
  console.log('⏳ Iniciando migração: Adicionar colunas do Asaas nas Organizações...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'INACTIVE',
      ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100),
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
    `);

    // Permitir teste inicial para organizações existentes - dando 3 dias de trial para não bloquear todo mundo de imediato
    await client.query(`
      UPDATE organizations 
      SET subscription_status = 'TRIAL', subscription_expires_at = CURRENT_TIMESTAMP + INTERVAL '3 days'
      WHERE subscription_status = 'INACTIVE' OR subscription_status IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Migração concluída: Colunas do Asaas adicionadas com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao rodar migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
