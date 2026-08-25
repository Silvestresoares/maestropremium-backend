import { Router } from 'express';
import { TeamsController } from './controllers/TeamsController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';

const teamsRoutes = Router();
const teamsController = new TeamsController();

// Todas as rotas de equipes requerem autenticação
teamsRoutes.use(isAuthenticated);

// Apenas admin pode criar/editar equipes fixas
teamsRoutes.post('/', isAdmin, teamsController.create);
teamsRoutes.put('/:id', isAdmin, teamsController.update);
teamsRoutes.delete('/:id', isAdmin, teamsController.delete);
teamsRoutes.post('/:id/members', isAdmin, teamsController.addMember);
teamsRoutes.delete('/:id/members/:userId', isAdmin, teamsController.removeMember);

// Qualquer membro logado pode listar as equipes
teamsRoutes.get('/', teamsController.index);

export { teamsRoutes };
