import { Router } from 'express';
import { SessionsController } from './controllers/SessionsController';

const sessionsRouter = Router();
const sessionsController = new SessionsController();

// Rota para o login
sessionsRouter.post('/', sessionsController.create);

export { sessionsRouter };