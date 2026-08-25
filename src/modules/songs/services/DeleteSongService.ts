import { SongsRepository } from '../repositories/SongsRepository';
import fs from 'fs';
import path from 'path';
import { AppError } from '../../../shared/errors/AppError';

export class DeleteSongService {
  async execute(id: string, organization_id?: string) {
    if (!organization_id) throw new AppError('Organização não definida.', 400);
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, organization_id);

    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    if (song.file_url) {
      const filePath = path.resolve(__dirname, '..', '..', '..', '..', 'uploads', song.file_url);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Erro ao deletar arquivo da música', err);
      }
    }

    await songsRepository.delete(id, organization_id);
  }
}
