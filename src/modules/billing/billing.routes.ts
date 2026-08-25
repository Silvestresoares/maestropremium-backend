import { Router } from 'express';
import { BillingController } from './controllers/BillingController';
import { WebhookController } from './controllers/WebhookController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';

const billingRoutes = Router();
const billingController = new BillingController();
const webhookController = new WebhookController();

billingRoutes.get('/plans', isAuthenticated, billingController.getPlans);
billingRoutes.get('/status', isAuthenticated, billingController.getSubscriptionStatus);
billingRoutes.post('/subscribe', isAuthenticated, billingController.subscribe);
billingRoutes.get('/pix-qr-code/:paymentId', isAuthenticated, billingController.getPixQrCode);

// Webhook from Asaas doesn't have our internal authentication
billingRoutes.post('/webhook/asaas', webhookController.handleAsaasWebhook);

export { billingRoutes };
