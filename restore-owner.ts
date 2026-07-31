import { pool } from './src/config/database';

async function restoreOwner() {
  console.log('⏳ Conectando ao banco de dados...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Restaurando is_super_admin para o criador do sistema...');
    
    // A query abaixo atualiza o usuário mais antigo (primeiro a ser criado) para super admin
    const result = await client.query(`
      UPDATE users 
      SET is_super_admin = true 
      WHERE id IN (
        SELECT id FROM users ORDER BY created_at ASC LIMIT 1
      )
      RETURNING name, email;
    `);

    if (result.rows.length > 0) {
      console.log(`✅ SUCESSO: O usuário ${result.rows[0].name} (${result.rows[0].email}) voltou a ser Super Admin!`);
    } else {
      console.log('⚠️ Nenhum usuário encontrado no sistema.');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao restaurar:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

restoreOwner();
