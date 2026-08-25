import { pool } from './src/config/database';
import { hash } from 'bcryptjs';

async function seedAdmin() {
  console.log('⏳ Criando Super Admin...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const email = 'maestro@admin.com';
    const password = '123456';
    const role = 'admin';
    const name = 'Mestre Maestro';

    // Hash da senha
    const passwordHash = await hash(password, 8);

    // Inserir Admin (usando ON CONFLICT para não duplicar se rodar mais de uma vez)
    const query = `
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $4
      RETURNING id, name, email, role;
    `;
    
    const res = await client.query(query, [name, email, passwordHash, role]);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Super Admin criado!');
    console.log(res.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar Super Admin:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedAdmin();
