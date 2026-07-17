import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';

interface Request {
  title: string;
  artist: string;
  tone: string;
  bpm: number;
  file_url?: string;
  youtube_url?: string;
  chord_pro?: string;
  time_signature?: string;
  organization_id?: string;
}

export class CreateSongService {
  async execute({ title, artist, tone, bpm, file_url, youtube_url, chord_pro, time_signature, organization_id }: Request) {
    if (!title || !artist || !tone) {
      throw new AppError('Título, Artista e Tom são obrigatórios.');
    }

    const songsRepository = new SongsRepository();
    const song = await songsRepository.create({
      title,
      artist,
      tone,
      bpm,
      file_url: file_url || '',
      youtube_url,
      chord_pro,
      time_signature,
      organization_id: organization_id || ''
    });

    return song;
  }
}