import { pool } from './src/config/database';

async function revertSuperAdmin() {
  console.log('⏳ Conectando ao banco de dados...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Removendo o status de super admin de todos os usuários...');
    await client.query(`
      UPDATE users 
      SET is_super_admin = false
    `);

    // Optionally, if we need a specific super admin, we could set the very first user (the owner) back,
    // but the system should work fine for a regular admin since the organization is now ACTIVE.

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Todos os usuários voltaram a ser admins normais/membros comuns.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao reverter:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

revertSuperAdmin();
