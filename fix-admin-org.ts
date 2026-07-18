import { pool } from './src/config/database';

async function fixAdminOrg() {
  const client = await pool.connect();
  try {
    // Pegar o id da organizacao padrao
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1;`);
    if (orgRes.rows.length === 0) {
      console.log('Nenhuma organizacao encontrada.');
      return;
    }
    const defaultOrgId = orgRes.rows[0].id;

    // Pegar o id do admin
    const adminRes = await client.query(`SELECT id FROM users WHERE email = 'maestro@admin.com';`);
    if (adminRes.rows.length === 0) {
      console.log('Admin nao encontrado.');
      return;
    }
    const adminId = adminRes.rows[0].id;

    // Inserir em organization_users
    await client.query(`
      INSERT INTO organization_users (user_id, organization_id, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (user_id, organization_id) DO NOTHING;
    `, [adminId, defaultOrgId]);

    console.log('Admin vinculado a organizacao padrao com sucesso!');
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixAdminOrg();
