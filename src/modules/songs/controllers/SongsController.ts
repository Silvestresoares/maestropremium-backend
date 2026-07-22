import { Request, Response } from 'express';
import { CreateSongService } from '../services/CreateSongService';
import { ListSongsService } from '../services/ListSongsService';
import { DeleteSongService } from '../services/DeleteSongService';
import { ShowSongService } from '../services/ShowSongService';
import { UpdateSongService } from '../services/UpdateSongService';
import { NotificationService } from '../../notifications/services/NotificationService';

export class SongsController {
  async create(request: Request, response: Response): Promise<Response> {
    const { title, artist, tone, bpm, chord_pro, time_signature } = request.body;
    const file_url = request.file?.path;

    if (!file_url && !chord_pro) {
      return response.status(400).json({ error: 'Você deve anexar um arquivo ou digitar a cifra.' });
    }

    const currentUser = (request as any).user;
    const createSongService = new CreateSongService();
    const song = await createSongService.execute({
      title,
      artist,
      tone,
      bpm: bpm ? Number(bpm) : 0,
      file_url,
      youtube_url: request.body.youtube_url,
      spotify_url: request.body.spotify_url,
      chord_pro,
      time_signature,
      organization_id: currentUser?.organization_id
    });

    return response.status(201).json(song);
  }

  async index(request: Request, response: Response): Promise<Response> {
    const currentUser = (request as any).user;
    const listSongsService = new ListSongsService();
    const songs = await listSongsService.execute(currentUser?.organization_id);

    return response.json(songs);
  }

  async show(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { targetKey } = request.query;

    const currentUser = (request as any).user;
    const showSongService = new ShowSongService();
    const song = await showSongService.execute(id as string, currentUser?.organization_id, targetKey as string);
    return response.json(song);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { title, artist, tone, bpm, chord_pro, time_signature } = request.body;

    const currentUser = (request as any).user;
    const updateSongService = new UpdateSongService();
    const song = await updateSongService.execute({
      id,
      title,
      artist,
      tone,
      bpm: bpm !== undefined ? Number(bpm) : undefined,
      youtube_url: request.body.youtube_url,
      spotify_url: request.body.spotify_url,
      chord_pro,
      time_signature,
      organization_id: currentUser?.organization_id
    });

    if (currentUser?.organization_id) {
      const notificationService = new NotificationService();
      notificationService.sendToOrganization(currentUser.organization_id, {
        title: 'Música Atualizada',
        body: `O repertório "${song.title}" sofreu uma alteração (tom, cifra ou andamento).`,
        url: `/songs/${song.id}`
      }).catch(err => console.error('Erro ao notificar:', err));
    }

    return response.json(song);
  }

  async delete(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;

    const currentUser = (request as any).user;
    const deleteSongService = new DeleteSongService();
    await deleteSongService.execute(id, currentUser?.organization_id);

    return response.status(204).send();
  }

  async generatePdf(request: Request, response: Response): Promise<void> {
    const { id } = request.params;
    const { frontendUrl } = request.query;

    if (!frontendUrl || typeof frontendUrl !== 'string') {
      response.status(400).json({ error: 'frontendUrl is required' });
      return;
    }

    try {
      // Import here to avoid loading puppeteer if the endpoint is not used
      const { PuppeteerGenerator } = require('../../../shared/utils/PuppeteerGenerator');
      
      const pdfBuffer = await PuppeteerGenerator.generatePdf(frontendUrl);
      
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename="cifra-${id}.pdf"`);
      response.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating PDF via Puppeteer:', err);
      response.status(500).json({ error: 'Internal server error while generating PDF' });
    }
  }
}