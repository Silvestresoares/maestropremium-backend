import { Request, Response } from 'express';
import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';
import crypto from 'crypto';

export class SongSheetMusicController {
  async upload(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { name } = request.body;
    const file_url = request.file?.path;

    if (!file_url || !name) {
      throw new AppError('Nome do arquivo e o arquivo são obrigatórios.');
    }

    const currentUser = (request as any).user;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    const currentFiles = song.sheet_music_files || [];
    const newFile = {
      id: crypto.randomBytes(16).toString('hex'),
      name,
      url: file_url
    };

    currentFiles.push(newFile);
    await songsRepository.updateSheetMusicFiles(id, currentUser?.organization_id, currentFiles);

    return response.status(201).json(newFile);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id, trackId } = request.params;
    const { name } = request.body;

    if (!name) {
      throw new AppError('Nome do arquivo é obrigatório.');
    }

    const currentUser = (request as any).user;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    const currentFiles = song.sheet_music_files || [];
    const trackIndex = currentFiles.findIndex((file: any) => file.id === trackId);

    if (trackIndex === -1) {
      throw new AppError('Arquivo não encontrado.', 404);
    }

    currentFiles[trackIndex].name = name;
    await songsRepository.updateSheetMusicFiles(id, currentUser?.organization_id, currentFiles);

    return response.json(currentFiles[trackIndex]);
  }

  async delete(request: Request, response: Response): Promise<Response> {
    const { id, trackId } = request.params;

    const currentUser = (request as any).user;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    let currentFiles = song.sheet_music_files || [];
    currentFiles = currentFiles.filter((file: any) => file.id !== trackId);

    await songsRepository.updateSheetMusicFiles(id, currentUser?.organization_id, currentFiles);

    return response.status(204).send();
  }
}
