import { Router } from 'express';
import { UsersController } from './controllers/UsersController';
import { sessionsRouter } from '../../modules/users/sessions.routes';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { authLimiter } from '../../shared/infra/http/middlewares/rateLimiter';

const usersRoutes = Router();
const usersController = new UsersController();
usersRoutes.use('/sessions', sessionsRouter);
Router.prototype.use = usersRoutes.use('/sessions', sessionsRouter);

// Definição da rota de cadastro PÚBLICA POST /users/register (Cria a Organização)
usersRoutes.post('/register', authLimiter, usersController.register.bind(usersController));

// Rota de recuperação de senha PÚBLICA POST /users/password/forgot
usersRoutes.post('/password/forgot', authLimiter, usersController.forgotPassword.bind(usersController));

// Rota de reset de senha PÚBLICA POST /users/password/reset
usersRoutes.post('/password/reset', authLimiter, usersController.resetPassword.bind(usersController));

// Rota de atualização de própria senha PUT /users/password/update - QUALQUER USUÁRIO LOGADO
usersRoutes.put('/password/update', isAuthenticated, usersController.changePassword.bind(usersController));

// Definição da rota de criação POST /users - PROTEGIDA!
usersRoutes.post('/', isAdmin, usersController.create.bind(usersController));

// Definição da rota de listagem GET /users - PROTEGIDA!
usersRoutes.get('/', isAdmin, usersController.index.bind(usersController));

// Rota para reenviar e-mail de convite POST /users/:id/resend-invite - PROTEGIDA!
usersRoutes.post('/:id/resend-invite', isAdmin, usersController.resendInvite.bind(usersController));

// Rota de atualização completa PUT /users/:id - PROTEGIDA!
usersRoutes.put('/:id', isAdmin, usersController.update.bind(usersController));

// Rota de atualização de cargo PUT /users/:id/role - PROTEGIDA!
usersRoutes.put('/:id/role', isAdmin, usersController.updateRole.bind(usersController));

// Rotas do Titular (LGPD)
usersRoutes.get('/me/export', isAuthenticated, usersController.exportData.bind(usersController));
usersRoutes.delete('/me', isAuthenticated, usersController.deleteMe.bind(usersController));
usersRoutes.post('/lgpd-consent', isAuthenticated, usersController.submitConsent.bind(usersController));

// Rotas de Admin LGPD
usersRoutes.get('/admin/lgpd/export/:email', isAdmin, usersController.exportDataByEmail.bind(usersController));
usersRoutes.delete('/admin/lgpd/anonymize/:email', isAdmin, usersController.anonymizeDataByEmail.bind(usersController));

// Rota de exclusão DELETE /users/:id - PROTEGIDA!
usersRoutes.delete('/:id', isAdmin, usersController.delete.bind(usersController));

export { usersRoutes };