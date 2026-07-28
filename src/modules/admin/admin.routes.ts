import { Router } from 'express';
import { SuperAdminController } from './controllers/SuperAdminController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { isSuperAdmin } from '../../shared/infra/http/middlewares/isSuperAdmin';

const adminRoutes = Router();
const superAdminController = new SuperAdminController();

// Todas as rotas administrativas exigem autenticação E permissão de super admin
adminRoutes.use(isAuthenticated, isSuperAdmin);

adminRoutes.get('/stats', superAdminController.getDashboardStats);
adminRoutes.get('/organizations', superAdminController.getOrganizations);
adminRoutes.patch('/organizations/:id/status', superAdminController.toggleSubscriptionStatus);

export { adminRoutes };
