import { Router } from 'express';
import { SetlistsController } from './controllers/SetlistsController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';

const setlistsController = new SetlistsController();
const setlistsRoutes = Router();

// Buscar todas as músicas de um evento
setlistsRoutes.get('/:eventId/pdf', setlistsController.exportPdf);
setlistsRoutes.get('/:eventId', setlistsController.show);

// Adicionar uma música ao repertório
setlistsRoutes.post('/:eventId/songs', isAdmin, setlistsController.addSong);

// Atualizar tom/capo de uma música no repertório
setlistsRoutes.put('/:eventId/songs/:songId', isAdmin, setlistsController.updateSong.bind(setlistsController));

// Remover uma música específica do repertório
setlistsRoutes.delete('/:eventId/songs/:songId', isAdmin, setlistsController.removeSong.bind(setlistsController));

export { setlistsRoutes };