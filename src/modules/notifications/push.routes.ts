import { Router } from 'express';
import { PushController } from './controllers/PushController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';

const pushRoutes = Router();
const pushController = new PushController();

pushRoutes.get('/vapid-public-key', pushController.getPublicKey);
pushRoutes.post('/subscribe', isAuthenticated, pushController.subscribe);

export { pushRoutes };
