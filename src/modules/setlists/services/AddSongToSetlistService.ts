import { SetlistsRepository } from '../repositories/SetlistsRepository';

interface Request {
  eventId: string;
  songId: string;
  position: number;
  tone?: string;
  capo?: number;
}

export class AddSongToSetlistService {
  private repository: SetlistsRepository;

  constructor() {
    this.repository = new SetlistsRepository();
  }

  async execute({ eventId, songId, position, tone, capo }: Request) {
    // Se no futuro você quiser colocar uma regra do tipo:
    // "Não permitir que a mesma música seja adicionada duas vezes no mesmo evento"
    // É exatamente neste arquivo que essa lógica vai entrar!
    
    const eventSong = await this.repository.addSong(eventId, songId, position, tone, capo);
    return eventSong;
  }
}