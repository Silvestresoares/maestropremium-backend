import { Request, Response } from 'express';
import { SongsRepository } from '../repositories/SongsRepository';

const songsRepository = new SongsRepository();

export class SongArrangementController {
  async save(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { arrangement } = request.body;
    const currentUser = (request as any).user;

    await songsRepository.updateArrangement(id, currentUser?.organization_id, arrangement ?? null);
    return response.json({ ok: true });
  }
}
