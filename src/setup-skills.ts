import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco para popular habilidades (skills)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Cria a tabela se não existir (embora provavelmente já exista via migrações)
    console.log('⏳ Garantindo que a tabela skills exista...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const skillsToInsert = [
      'Voz (Ministro)',
      'Voz (Backing Vocal)',
      'Violão',
      'Guitarra',
      'Baixo',
      'Bateria',
      'Teclado',
      'Percussão'
    ];

    console.log('⏳ Inserindo habilidades base...');
    
    for (const skill of skillsToInsert) {
      // Verifica se já existe para não duplicar
      const checkResult = await client.query('SELECT * FROM skills WHERE name = $1', [skill]);
      if (checkResult.rows.length === 0) {
        await client.query('INSERT INTO skills (name) VALUES ($1)', [skill]);
        console.log(`✔️  Adicionado: ${skill}`);
      } else {
        console.log(`➖ Já existe: ${skill}`);
      }
    }

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Habilidades inseridas com sucesso no banco de dados!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao inserir habilidades:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();
