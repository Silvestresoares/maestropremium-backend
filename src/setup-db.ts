import { pool } from './config/database';

async function runSetup() {
  console.log('⏳ Conectando ao banco pelo Node.js...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏳ Criando tabela de Eventos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          date_time TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criação da tabela songs movida para setup-songs-db.ts

    console.log('⏳ Criando tabela de Cifras...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS song_charts (
          song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
          structure JSONB NOT NULL,
          PRIMARY KEY (song_id)
      );
    `);

    console.log('⏳ Criando tabela de Repertórios (event_songs)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_songs (
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          PRIMARY KEY (event_id, song_id)
      );
    `);

    console.log('⏳ Criando tabela de Equipe (event_team)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_team (
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          assignment VARCHAR(255) NOT NULL,
          PRIMARY KEY (event_id, user_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Todas as tabelas foram criadas no banco correto!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro fatal ao criar tabelas:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSetup();