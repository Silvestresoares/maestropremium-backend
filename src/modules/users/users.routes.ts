import { Router } from 'express';
import { UsersController } from './controllers/UsersController';
import { sessionsRouter } from '../../modules/users/sessions.routes';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';

const usersRoutes = Router();
const usersController = new UsersController();
usersRoutes.use('/sessions', sessionsRouter);
Router.prototype.use = usersRoutes.use('/sessions', sessionsRouter);

// Definição da rota de cadastro PÚBLICA POST /users/register (Cria a Organização)
usersRoutes.post('/register', usersController.register.bind(usersController));

// Definição da rota de criação POST /users - PROTEGIDA!
usersRoutes.post('/', isAdmin, usersController.create.bind(usersController));

// Definição da rota de listagem GET /users - PROTEGIDA!
usersRoutes.get('/', isAdmin, usersController.index.bind(usersController));

// Rota de atualização completa PUT /users/:id - PROTEGIDA!
usersRoutes.put('/:id', isAdmin, usersController.update.bind(usersController));

// Rota de atualização de cargo PUT /users/:id/role - PROTEGIDA!
usersRoutes.put('/:id/role', isAdmin, usersController.updateRole.bind(usersController));

// Rota de exclusão DELETE /users/:id - PROTEGIDA!
usersRoutes.delete('/:id', isAdmin, usersController.delete.bind(usersController));

export { usersRoutes };