import { pool } from './src/config/database';

async function fixBilling() {
  console.log('⏳ Conectando ao banco de dados...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Atualizando todas as organizações para status ACTIVE...');
    await client.query(`
      UPDATE organizations 
      SET subscription_status = 'ACTIVE', 
          subscription_expires_at = NOW() + INTERVAL '10 years';
    `);

    console.log('⏳ Definindo todos os admins como super_admin...');
    await client.query(`
      UPDATE users 
      SET is_super_admin = true
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Sistema liberado da tela de billing (PAYWALL removido localmente)!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao liberar o sistema:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixBilling();
