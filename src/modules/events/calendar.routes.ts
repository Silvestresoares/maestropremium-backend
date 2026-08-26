import { Router } from 'express';
import { CalendarController } from './controllers/CalendarController';

const calendarRoutes = Router();
const calendarController = new CalendarController();

// A rota recebe o userId na URL (sendo pública para o Google ler sem headers de auth)
calendarRoutes.get('/feed/:userId', calendarController.getFeed);

export { calendarRoutes };
