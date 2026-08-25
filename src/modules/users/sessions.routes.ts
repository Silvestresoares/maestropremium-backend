import { Router } from 'express';
import { SessionsController } from './controllers/SessionsController';
import { authLimiter } from '../../shared/infra/http/middlewares/rateLimiter';

const sessionsRouter = Router();
const sessionsController = new SessionsController();

// Rota para o login
sessionsRouter.post('/', authLimiter, sessionsController.create);

export { sessionsRouter };