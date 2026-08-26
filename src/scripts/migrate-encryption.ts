import { pool } from '../config/database';
import { CryptoService } from '../shared/utils/CryptoService';

async function migrateEncryption() {
  const client = await pool.connect();
  
  try {
    console.log('⏳ Iniciando migração de criptografia PII (Data at Rest)...');
    await client.query('BEGIN');

    // 1. Adicionar a coluna email_hash
    console.log('⏳ Adicionando coluna email_hash...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_hash VARCHAR(255);
    `);

    // 2. Buscar todos os usuários atuais
    console.log('⏳ Buscando usuários para criptografar...');
    const result = await client.query('SELECT id, name, email FROM users');
    const users = result.rows;

    console.log(`Encontrados ${users.length} usuários. Processando...`);

    // 3. Criptografar cada um e gerar o hash
    for (const user of users) {
      // Ignora se já estiver criptografado (checa os 2 ':')
      if (user.email && user.email.split(':').length === 3) {
        continue;
      }

      const emailHash = CryptoService.generateBlindIndex(user.email);
      const encryptedEmail = CryptoService.encrypt(user.email);
      const encryptedName = CryptoService.encrypt(user.name);

      await client.query(`
        UPDATE users 
        SET email = $1, name = $2, email_hash = $3
        WHERE id = $4
      `, [encryptedEmail, encryptedName, emailHash, user.id]);
    }

    // 4. (Opcional, mas recomendado) Adicionar UNIQUE Constraint no email_hash em vez do email
    // Como estamos mudando a constraint UNIQUE do email para email_hash, podemos fazer:
    console.log('⏳ Atualizando constraints (removendo unique de email e adicionando em email_hash)...');
    try {
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;`);
      await client.query(`ALTER TABLE users ADD CONSTRAINT users_email_hash_key UNIQUE (email_hash);`);
    } catch (e: any) {
      console.log('⚠️ Aviso ao alterar constraints:', e.message);
    }

    await client.query('COMMIT');
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateEncryption();
