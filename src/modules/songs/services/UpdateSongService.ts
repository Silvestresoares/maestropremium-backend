import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';

interface Request {
  id: string;
  title?: string;
  artist?: string;
  tone?: string;
  bpm?: number;
  youtube_url?: string;
  chord_pro?: string;
  time_signature?: string;
  organization_id: string;
}

export class UpdateSongService {
  async execute({ id, title, artist, tone, bpm, youtube_url, chord_pro, time_signature, organization_id }: Request) {
    if (!organization_id) throw new AppError('Organização não definida.', 400);
    const songsRepository = new SongsRepository();
    
    // First, verify the song exists
    const songExists = await songsRepository.findById(id, organization_id);

    if (!songExists) {
      throw new AppError('Música não encontrada.', 404);
    }

    // Call update on repository
    const updatedSong = await songsRepository.update({
      id,
      title: title ?? songExists.title,
      artist: artist ?? songExists.artist,
      tone: tone ?? songExists.tone,
      bpm: bpm !== undefined ? bpm : songExists.bpm,
      youtube_url: youtube_url !== undefined ? youtube_url : songExists.youtube_url,
      chord_pro: chord_pro !== undefined ? chord_pro : songExists.chord_pro,
      time_signature: time_signature !== undefined ? time_signature : songExists.time_signature,
      organization_id,
    });

    return updatedSong;
  }
}
