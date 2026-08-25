import { Request, Response } from 'express';
import { z } from 'zod';
import { SetlistsRepository } from '../repositories/SetlistsRepository';
import { AddSongToSetlistService } from '../services/AddSongToSetlistService';
import { PdfGenerator } from '../../../shared/utils/PdfGenerator';

// Validação dos dados que chegam no corpo da requisição
const addSongSchema = z.object({
  song_id: z.string().uuid("O ID da música precisa ser um UUID válido."),
  position: z.number().int().positive("A posição deve ser um número inteiro e positivo."),
  tone: z.string().optional(),
  capo: z.number().int().min(0).max(12).optional()
});

export class SetlistsController {
  
  // Lista todas as músicas de um evento (Repertório completo)
  async show(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const repo = new SetlistsRepository();
      
      const setlist = await repo.getSetlistByEventId(eventId);
      
      return res.status(200).json(setlist);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao buscar o repertório.' });
    }
  }

  // Adiciona uma música ao repertório do evento
  async addSong(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const { song_id, position, tone, capo } = addSongSchema.parse(req.body);

      const addSongService = new AddSongToSetlistService();
      
      const eventSong = await addSongService.execute({ 
        eventId, 
        songId: song_id, 
        position,
        tone,
        capo
      });

      return res.status(201).json(eventSong);
    } catch (error) {
      console.error(error);
      // O erro 400 pode ser disparado pelo Zod ou por erro de Chave Estrangeira do BD
      return res.status(400).json({ error: 'Erro ao adicionar música. Verifique se os dados e IDs estão corretos.' });
    }
  }

  // Atualiza tom e capo de uma música já adicionada
  async updateSong(req: Request, res: Response) {
    try {
      const { eventId, songId } = req.params;
      const { tone, capo } = req.body;
      const repo = new SetlistsRepository();
      
      const eventSong = await repo.updateSong(eventId, songId, tone, capo);
      return res.status(200).json(eventSong);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar a música no repertório.' });
    }
  }

  // Remove a música do evento
  async removeSong(req: Request, res: Response) {
    try {
      const { eventId, songId } = req.params;
      const repo = new SetlistsRepository();
      
      await repo.removeSong(eventId, songId);
      
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao remover a música.' });
    }
  }

  async exportPdf(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const repo = new SetlistsRepository();
      
      const setlistSongs = await repo.getSetlistByEventId(eventId);

      // Aqui poderíamos buscar dados do evento também, mas passaremos um mock simples para o PdfGenerator
      const eventInfo = { id: eventId }; 

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Repertorio-${eventId}.pdf"`);

      PdfGenerator.generateSetlistPdf(eventInfo, setlistSongs, res);

    } catch (error: any) {
      console.error('Erro ao gerar PDF do repertório:', error);
      return res.status(500).json({ error: 'Erro interno ao gerar PDF do repertório.' });
    }
  }
}