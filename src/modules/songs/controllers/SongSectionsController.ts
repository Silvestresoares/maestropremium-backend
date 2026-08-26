import { Request, Response } from 'express';
import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';

export class SongSectionsController {
  async update(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { sections } = request.body;

    if (!Array.isArray(sections)) {
      throw new AppError('Sections deve ser um array.');
    }

    const currentUser = request.user!;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    await songsRepository.updateSections(id, currentUser?.organization_id, sections);

    return response.json({ sections });
  }
}
