import { Request, Response } from 'express';
import { SongsRepository } from '../repositories/SongsRepository';
import { AppError } from '../../../shared/errors/AppError';
import crypto from 'crypto';

export class SongAudioController {
  async upload(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { name } = request.body;
    const file_url = request.file?.path;

    if (!file_url || !name) {
      throw new AppError('Nome do kit e arquivo de áudio são obrigatórios.');
    }

    const currentUser = (request as any).user;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    const currentFiles = song.audio_files || [];
    const newFile = {
      id: crypto.randomBytes(16).toString('hex'),
      name,
      url: file_url
    };

    currentFiles.push(newFile);
    await songsRepository.updateAudioFiles(id, currentUser?.organization_id, currentFiles);

    return response.status(201).json(newFile);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id, trackId } = request.params;
    const { name } = request.body;

    if (!name) {
      throw new AppError('Nome do kit é obrigatório.');
    }

    const currentUser = (request as any).user;
    const songsRepository = new SongsRepository();
    
    const song = await songsRepository.findById(id, currentUser?.organization_id);
    if (!song) {
      throw new AppError('Música não encontrada.', 404);
    }

    const currentFiles = song.audio_files || [];
    const trackIndex = currentFiles.findIndex(file => file.id === trackId);

    if (trackIndex === -1) {
      throw new AppError('Áudio não encontrado.', 404);
    }

    currentFiles[trackIndex].name = name;

    await songsRepository.updateAudioFiles(id, currentUser?.organization_id, currentFiles);

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

    const currentFiles = song.audio_files || [];
    const updatedFiles = currentFiles.filter(file => file.id !== trackId);

    await songsRepository.updateAudioFiles(id, currentUser?.organization_id, updatedFiles);

    return response.status(204).send();
  }
}
