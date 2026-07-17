require('dotenv').config();
const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    console.log(`✅ Conectado com sucesso na porta ${process.env.DB_PORT}!`);
    
    // Agora vamos apagar a coluna antiga e insegura 'password'
    await client.query('ALTER TABLE users DROP COLUMN IF EXISTS password;');
    console.log('✅ Coluna velha "password" removida com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase();