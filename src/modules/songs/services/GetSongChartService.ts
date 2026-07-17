import { SongsRepository, SongRow } from '../repositories/SongsRepository';
import { ChordTransposer } from '../../../shared/utils/ChordTransposer';

export class GetSongChartService {
  private songsRepository: SongsRepository;

  constructor() {
    this.songsRepository = new SongsRepository();
  }

  async execute(id: string, organization_id: string, targetKey?: string): Promise<SongRow> {
    const song = await this.songsRepository.findById(id, organization_id);

    if (!song) {
      throw new Error('Música não encontrada');
    }

    // Se o usuário pediu um tom novo e a cifra existir, a mágica acontece
    if (targetKey && song.chord_pro && targetKey !== song.tone) {
      song.chord_pro = ChordTransposer.transpose(
        song.chord_pro,
        song.tone,
        targetKey
      );
      
      // Opcional: Atualizamos o campo original_key na resposta para o frontend saber o tom atual exibido
      song.tone = targetKey; 
    }

    return song;
  }
}