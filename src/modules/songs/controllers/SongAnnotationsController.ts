import { Request, Response } from 'express';
import { GetSongAnnotationService } from '../services/GetSongAnnotationService';
import { SaveSongAnnotationService } from '../services/SaveSongAnnotationService';

export class SongAnnotationsController {
  async show(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const userId = (request as any).user.id; // From isAuthenticated middleware

    const getAnnotationService = new GetSongAnnotationService();
    const annotation = await getAnnotationService.execute(userId, id);

    return response.json(annotation || { content: '' });
  }

  async save(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { content } = request.body;
    const userId = (request as any).user.id;

    const saveAnnotationService = new SaveSongAnnotationService();
    const annotation = await saveAnnotationService.execute({
      userId,
      songId: id,
      content
    });

    return response.json(annotation);
  }
}
