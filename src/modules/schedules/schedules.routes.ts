import { Router } from 'express';
import { SchedulesController } from './controllers/SchedulesController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';

const schedulesRoutes = Router();
const schedulesController = new SchedulesController();

schedulesRoutes.post('/events', isAuthenticated, schedulesController.createEvent); // Criar culto/ensaio
schedulesRoutes.post('/', isAuthenticated, schedulesController.createSchedule);   // Escalar alguém

export { schedulesRoutes };