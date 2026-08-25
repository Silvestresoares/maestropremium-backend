import { SongsRepository } from '../repositories/SongsRepository';

export class ListSongsService {
  async execute(organization_id?: string) {
    if (!organization_id) return [];
    const songsRepository = new SongsRepository();
    const songs = await songsRepository.findAll(organization_id);
    return songs;
  }
}
