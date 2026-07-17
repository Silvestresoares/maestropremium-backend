import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 20,              // Máximo de conexões simultâneas no pool
  idleTimeoutMillis: 30000, // Tempo para fechar conexões ociosas
  connectionTimeoutMillis: 2000, // Tempo limite para conseguir uma conexão antes de dar erro
};

// Configuração dinâmica de SSL para ambientes Cloud/Produção
if (process.env.DB_SSL === 'true') {
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