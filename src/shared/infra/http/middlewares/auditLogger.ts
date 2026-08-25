import { Request, Response, NextFunction } from 'express';
import { pool } from '../../../../config/database';

export async function auditLogger(request: Request, response: Response, next: NextFunction) {
  // Executar a requisição normalmente primeiro
  const originalSend = response.send;
  let responseBody: any;
  
  response.send = function (body: any) {
    responseBody = body;
    return originalSend.apply(this, arguments as any);
  };

  // Quando a requisição finalizar, gravamos o log assincronamente (non-blocking)
  response.on('finish', async () => {
    // Apenas logamos métodos que alteram dados (POST, PUT, PATCH, DELETE)
    // Ignoramos GET, OPTIONS, HEAD para não inundar o banco
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const currentUser = request.user;
      
      // Se a rota for pública e não teve usuário injetado, ignoramos ou logamos sem user_id
      if (!currentUser) return;

      const action = request.method;
      const resource = request.originalUrl;
      const organizationId = currentUser.organization_id || null;

      // Mascaramento de senhas no metadata
      const bodyClone = { ...request.body };
      if (bodyClone.password) bodyClone.password = '***';
      if (bodyClone.newPassword) bodyClone.newPassword = '***';

      const metadata = {
        body: bodyClone,
        params: request.params,
        query: request.query,
        ip: request.ip || request.connection.remoteAddress,
        userAgent: request.headers['user-agent'],
        statusCode: response.statusCode
      };

      try {
        await pool.query(`
          INSERT INTO audit_logs (user_id, organization_id, action, resource, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [currentUser.id, organizationId, action, resource, JSON.stringify(metadata)]);
      } catch (err) {
        // Falha no log não deve derrubar a aplicação, apenas logamos no console de erro do servidor
        console.error('Falha ao gravar audit_log:', err);
      }
    }
  });

  return next();
}
