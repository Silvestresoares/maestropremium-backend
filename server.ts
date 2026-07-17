import 'dotenv/config';
import { app } from './src/shared/infra/http/app';
import { pool } from './src/config/database';
const PORT = process.env.PORT || 3333;

async function startServer() {
  try {
    // Tenta executar uma query simples de teste no banco
    const client = await pool.connect();
    console.log('💾 [Database]: Conexão com o banco de dados validada com sucesso!');
    client.release(); // Libera o cliente de volta para o pool

    // Inicia o servidor HTTP apenas se o banco responder
    app.listen(PORT, () => {
      console.log(`🚀 [Maestro]: Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ [Critical]: Falha ao iniciar o servidor. Não foi possível conectar ao banco de dados.');
    console.error(error);
    process.exit(1); // Encerra a aplicação com código de erro
  }
}

startServer();