import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';
import { ChordTransposer } from '../../../shared/utils/ChordTransposer';

export class ShowSongService {
  async execute(id: string, organization_id?: string, targetKey?: string) {
    if (!organization_id) throw new AppError('Organização não definida.', 400);
    const songsRepository = new SongsRepository();
    const song = await songsRepository.findById(id, organization_id);

    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    if (targetKey && song.chord_pro && targetKey !== song.tone) {
      song.chord_pro = ChordTransposer.transpose(song.chord_pro, song.tone, targetKey);
      song.tone = targetKey; // Update tone for the response
    }

    return song;
  }
}
