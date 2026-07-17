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
import { isAuthenticated } from './middlewares/isAuthenticated';


interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

dotenv.config();

import path from 'path';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/files', express.static(path.resolve(__dirname, '..', '..', '..', '..', 'uploads')));

// Registro de rotas dos módulos
app.use('/users', usersRoutes);
app.use('/songs', songsRoutes);
app.use('/schedules', schedulesRoutes);
app.use('/events', eventsRoutes);
app.use('/setlists', setlistsRoutes);
app.use('/sessions', sessionsRouter);
app.use('/skills', skillsRoutes);

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
  const userId = (request as any).user.id;

  return response.json({
    message: "Acesso liberado!",
    userId: userId
  });
});

app.use(errorHandler);

export { app };