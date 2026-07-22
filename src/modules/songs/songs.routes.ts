import { Router } from 'express';
import multer from 'multer';
import { uploadConfig } from '../../config/upload';
import { SongsController } from './controllers/SongsController';
import { SongAnnotationsController } from './controllers/SongAnnotationsController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';
import { isAdmin } from '../../shared/infra/http/middlewares/isAdmin';
import { SongAudioController } from './controllers/SongAudioController';

const songsRoutes = Router();
const upload = multer(uploadConfig);
const songsController = new SongsController();
const annotationsController = new SongAnnotationsController();
const audioController = new SongAudioController();

// Todos os usuários autenticados podem ver a lista de músicas
songsRoutes.get('/', isAuthenticated, songsController.index.bind(songsController));

// Todos podem ver uma música específica
songsRoutes.get('/:id', isAuthenticated, songsController.show.bind(songsController));

// Gerar PDF da música
songsRoutes.get('/:id/pdf', isAuthenticated, songsController.generatePdf.bind(songsController));

// Apenas administradores podem adicionar músicas (upload de PDF)
songsRoutes.post('/', isAdmin, upload.single('file'), songsController.create.bind(songsController));

// Apenas administradores podem atualizar músicas
songsRoutes.put('/:id', isAdmin, songsController.update.bind(songsController));

// Apenas administradores podem deletar músicas
songsRoutes.delete('/:id', isAdmin, songsController.delete.bind(songsController));

// Notas pessoais nas músicas
songsRoutes.get('/:id/annotations', isAuthenticated, annotationsController.show.bind(annotationsController));
songsRoutes.post('/:id/annotations', isAuthenticated, annotationsController.save.bind(annotationsController));

// Arquivos de Áudio (Kits de Vozes)
songsRoutes.post('/:id/audio', isAdmin, upload.single('file'), audioController.upload.bind(audioController));
songsRoutes.put('/:id/audio/:trackId', isAdmin, audioController.update.bind(audioController));
songsRoutes.delete('/:id/audio/:trackId', isAdmin, audioController.delete.bind(audioController));

export { songsRoutes };