import { SongAnnotationsRepository, SongAnnotationRow } from '../repositories/SongAnnotationsRepository';

interface Request {
  userId: string;
  songId: string;
  content: string;
}

export class SaveSongAnnotationService {
  private repository: SongAnnotationsRepository;

  constructor() {
    this.repository = new SongAnnotationsRepository();
  }

  async execute({ userId, songId, content }: Request): Promise<SongAnnotationRow> {
    if (!content) content = '';
    return this.repository.upsert(userId, songId, content);
  }
}
