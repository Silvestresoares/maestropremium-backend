import express, { Request, Response } from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import { usersRoutes } from '../../../modules/users/users.routes';
import { songsRoutes } from '../../../modules/songs/songs.routes';
import { schedulesRoutes } from '../../../modules/schedules/schedules.routes';
import { eventsRoutes } from '../../../modules/events/events.routes';
import { setlistsRoutes } from '../../../modules/setlists/setlists.routes';
import { sessionsRouter } from '../../../modules/users/sessions.routes';
import { skillsRoutes } from '../../../modules/skills/skills.routes';
import { pushRoutes } from '../../../modules/notifications/push.routes';
import { teamsRoutes } from '../../../modules/teams/teams.routes';
import { billingRoutes } from '../../../modules/billing/billing.routes';
import { adminRoutes } from '../../../modules/admin/admin.routes';
import { isAuthenticated } from './middlewares/isAuthenticated';
import { requireActiveSubscription } from './middlewares/requireActiveSubscription';


dotenv.config();

import path from 'path';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/files', express.static(path.resolve(__dirname, '..', '..', '..', '..', 'uploads')));

import { auditLogger } from './middlewares/auditLogger';

// Middleware global de auditoria LGPD
app.use(auditLogger);

// Registro de rotas dos módulos (públicas ou que apenas exigem auth)
app.use('/users', usersRoutes);
app.use('/sessions', sessionsRouter);
app.use('/push', pushRoutes);
app.use('/billing', billingRoutes);
app.use('/super-admin', adminRoutes);

// Rotas B2B (exigem assinatura ativa)
app.use('/songs', isAuthenticated, requireActiveSubscription, songsRoutes);
app.use('/schedules', isAuthenticated, requireActiveSubscription, schedulesRoutes);
app.use('/events', isAuthenticated, requireActiveSubscription, eventsRoutes);
app.use('/setlists', isAuthenticated, requireActiveSubscription, setlistsRoutes);
app.use('/teams', isAuthenticated, requireActiveSubscription, teamsRoutes);
app.use('/skills', isAuthenticated, requireActiveSubscription, skillsRoutes);

app.get('/health', (request: Request, response: Response) => {
  return response.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'maestro-backend'
  });
});

app.get('/perfil', isAuthenticated, (request: Request, response: Response) => {
  // Como o middleware isAuthenticated passou, nós já sabemos que o request.user existe.
  // Para evitar criar uma interface só para isso aqui, podemos usar "as any" 
  // só nesta linha de teste para matar a reclamação do TypeScript:
  const userId = request.user?.id;

  return response.json({
    message: "Acesso liberado!",
    userId: userId
  });
});

app.use(errorHandler);

export { app };