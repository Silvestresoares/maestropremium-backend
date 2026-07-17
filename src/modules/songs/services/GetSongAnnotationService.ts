import { SongAnnotationsRepository, SongAnnotationRow } from '../repositories/SongAnnotationsRepository';

export class GetSongAnnotationService {
  private repository: SongAnnotationsRepository;

  constructor() {
    this.repository = new SongAnnotationsRepository();
  }

  async execute(userId: string, songId: string): Promise<SongAnnotationRow | null> {
    return this.repository.findByUserAndSong(userId, songId);
  }
}
