import { Request, Response } from 'express';
import { PushSubscriptionsRepository } from '../repositories/PushSubscriptionsRepository';
import { VAPID_PUBLIC_KEY, webpush } from '../../../config/webpush';
import { AppError } from '../../../shared/errors/AppError';

export class PushController {
  async getPublicKey(request: Request, response: Response): Promise<Response> {
    return response.json({ publicKey: VAPID_PUBLIC_KEY });
  }

  async subscribe(request: Request, response: Response): Promise<Response> {
    const { subscription } = request.body;
    const currentUser = (request as any).user;

    if (!subscription || !subscription.endpoint) {
      throw new AppError('Inscrição inválida.');
    }

    if (!currentUser || !currentUser.organization_id) {
      throw new AppError('Usuário não autenticado ou sem organização.');
    }

    const repository = new PushSubscriptionsRepository();
    
    await repository.save({
      user_id: currentUser.id,
      organization_id: currentUser.organization_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    });

    // Send a test notification immediately (optional)
    try {
      const payload = JSON.stringify({
        title: 'Notificações Ativadas!',
        body: 'Você receberá avisos do Maestro Cifras aqui.',
        url: '/dashboard'
      });
      await webpush.sendNotification(subscription, payload);
    } catch (err) {
      console.error('Erro ao enviar notificação de teste:', err);
    }

    return response.status(201).json({ message: 'Inscrição salva com sucesso' });
  }
}
