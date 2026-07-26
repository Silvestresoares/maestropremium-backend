import { Request, Response } from 'express';
import { GetSongAnnotationService } from '../services/GetSongAnnotationService';
import { SaveSongAnnotationService } from '../services/SaveSongAnnotationService';

export class SongAnnotationsController {
  async show(request: Request, response: Response): Promise<Response | void> {
    const { id } = request.params;
    const { eventId } = request.query;
    const userId = (request as any).user.id; // From isAuthenticated middleware
    
    if (!eventId || typeof eventId !== 'string') {
      return response.status(400).json({ error: 'eventId is required in query' });
    }

    const getAnnotationService = new GetSongAnnotationService();
    const annotation = await getAnnotationService.execute(userId, id, eventId);

    return response.json(annotation || { content: '' });
  }

  async save(request: Request, response: Response): Promise<Response | void> {
    const { id } = request.params;
    const { content } = request.body;
    const { eventId } = request.query;
    const userId = (request as any).user.id;

    if (!eventId || typeof eventId !== 'string') {
      return response.status(400).json({ error: 'eventId is required in query' });
    }

    const saveAnnotationService = new SaveSongAnnotationService();
    const annotation = await saveAnnotationService.execute({
      userId,
      songId: id,
      eventId,
      content
    });

    return response.json(annotation);
  }
}
