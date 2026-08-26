import { pool } from './src/config/database';
import { ResetPasswordService } from './src/modules/users/services/ResetPasswordService';

async function test() {
  const service = new ResetPasswordService();
  try {
    await service.execute('63bf3626db78ccbff9549afc2a1f457491fb72ea6a3f9eb6e82cd3f997c21979', '123456');
    console.log("SUCESSO!");
  } catch (e) {
    console.error("ERRO:", e);
  }
  pool.end();
  process.exit(0);
}

test();
