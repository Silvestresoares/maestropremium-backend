import { pool } from './src/config/database';

async function migrateMultiTenancy() {
  console.log('⏳ Iniciando migração para Multi-Tenancy...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Criar tabela de Organizations
    console.log('⏳ Criando tabela organizations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Criar tabela de relacionamento User <-> Organization
    console.log('⏳ Criando tabela organization_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organization_users (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'musician',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, organization_id)
      );
    `);

    // 3. Adicionar organization_id nas tabelas principais
    console.log('⏳ Adicionando organization_id nas tabelas...');
    const tables = ['songs', 'events', 'song_annotations', 'user_skills', 'event_songs', 'event_team'];
    for (const table of tables) {
      // Check if table exists first before altering (some might be empty or missing)
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (res.rows[0].exists) {
         // Add column if it doesn't exist
         await client.query(`
           ALTER TABLE ${table} 
           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
         `);
      }
    }

    // 4. Migrar dados existentes para uma Organização Padrão
    console.log('⏳ Migrando dados existentes para uma Organização Padrão...');
    const orgRes = await client.query(`
      INSERT INTO organizations (name) 
      VALUES ('Ministério Padrão') 
      RETURNING id;
    `);
    const defaultOrgId = orgRes.rows[0].id;

    // Migrar Usuários existentes
    const usersRes = await client.query('SELECT id, role FROM users;');
    for (const user of usersRes.rows) {
      await client.query(`
        INSERT INTO organization_users (user_id, organization_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING;
      `, [user.id, defaultOrgId, user.role]);
    }

    // A coluna 'role' da tabela 'users' não será mais usada globalmente, mas vamos mantê-la por retrocompatibilidade temporária ou dropá-la depois.
    
    // Atualizar dados existentes com a organização padrão
    for (const table of tables) {
       const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      if (res.rows[0].exists) {
        await client.query(`UPDATE ${table} SET organization_id = $1 WHERE organization_id IS NULL;`, [defaultOrgId]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migração para Multi-Tenancy concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateMultiTenancy();
