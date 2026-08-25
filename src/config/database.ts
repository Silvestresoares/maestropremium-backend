import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    };

poolConfig.max = 20;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 2000;

// Configuração dinâmica de SSL para ambientes Cloud/Produção (Neon.tech requer SSL)
if (process.env.DB_SSL === 'true' || process.env.DATABASE_URL) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

// Evento de escuta para monitorar a saúde das conexões do pool
pool.on('connect', () => {
  console.log('✨ [Database]: Nova conexão estabelecida com o PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ [Database]: Erro inesperado em uma conexão ociosa do pool', err);
});

export { pool };