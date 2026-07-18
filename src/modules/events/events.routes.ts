import { Router } from 'express';
import { EventsController } from './controllers/EventsController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';

const eventsRoutes = Router();
const eventsController = new EventsController();

// Rotas (Autenticadas)
eventsRoutes.get('/', isAuthenticated, eventsController.list);

// Rotas protegidas (só administradores podem alterar)
eventsRoutes.post('/', isAdmin, eventsController.create);
eventsRoutes.put('/:id', isAdmin, eventsController.update);
eventsRoutes.delete('/:id', isAdmin, eventsController.delete);

// Rotas de repertório (músicas no evento)
eventsRoutes.put('/:id/songs/reorder', isAdmin, eventsController.reorderSongs);
eventsRoutes.post('/:id/songs', isAdmin, eventsController.addSong);
eventsRoutes.delete('/:id/songs/:songId', isAdmin, eventsController.removeSong);

// Rotas de equipe (usuários no evento)
eventsRoutes.post('/:id/team', isAdmin, eventsController.addTeamMember);
eventsRoutes.post('/:id/apply-team', isAdmin, eventsController.applyTeam);
eventsRoutes.delete('/:id/team/:userId', isAdmin, eventsController.removeTeamMember);

export { eventsRoutes };
