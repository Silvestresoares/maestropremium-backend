import { webpush } from '../../../config/webpush';
import { PushSubscriptionsRepository } from '../repositories/PushSubscriptionsRepository';

export class NotificationService {
  /**
   * Envia uma notificação para todos os membros inscritos de uma organização.
   */
  async sendToOrganization(organization_id: string, payload: { title: string; body: string; url?: string }) {
    if (!organization_id) return;

    try {
      const repository = new PushSubscriptionsRepository();
      const subscriptions = await repository.findByOrganization(organization_id);

      if (subscriptions.length === 0) {
        return;
      }

      const stringifiedPayload = JSON.stringify(payload);

      const sendPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, stringifiedPayload);
        } catch (error: any) {
          // Status 410 Gone ou 404 Not Found indica que a inscrição expirou ou o usuário revogou o acesso.
          if (error.statusCode === 410 || error.statusCode === 404) {
            await repository.deleteByEndpoint(sub.endpoint);
          } else {
            console.error('Erro ao enviar notificação push:', error);
          }
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error('Erro no NotificationService:', error);
    }
  }

  /**
   * Envia uma notificação apenas para um usuário específico.
   */
  async sendToUser(user_id: string, payload: { title: string; body: string; url?: string }) {
    if (!user_id) return;

    try {
      const repository = new PushSubscriptionsRepository();
      const subscriptions = await repository.findByUser(user_id);

      if (subscriptions.length === 0) {
        return;
      }

      const stringifiedPayload = JSON.stringify(payload);

      const sendPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, stringifiedPayload);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await repository.deleteByEndpoint(sub.endpoint);
          } else {
            console.error('Erro ao enviar notificação push:', error);
          }
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error('Erro no NotificationService:', error);
    }
  }
}
