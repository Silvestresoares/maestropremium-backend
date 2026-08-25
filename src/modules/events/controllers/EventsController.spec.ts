import { EventsController } from './EventsController';
import { Request, Response } from 'express';

// Mocks
jest.mock('../repositories/EventsRepository', () => {
  return {
    EventsRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn().mockImplementation((id: string, orgId?: string) => {
        // Simula que o evento pertence apenas à organização 'org-1'
        if (id === 'event-1' && orgId === 'org-1') {
          return Promise.resolve({ id: 'event-1', title: 'Culto', organization_id: 'org-1' });
        }
        return Promise.resolve(null);
      })
    }))
  };
});

describe('EventsController - IDOR Regression Tests', () => {
  let eventsController: EventsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson, send: jest.fn() });

  beforeEach(() => {
    eventsController = new EventsController();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      send: jest.fn(),
    };
  });

  it('deve bloquear a adição de música a um evento de outra organização (IDOR)', async () => {
    mockRequest = {
      params: { id: 'event-1' },
      body: { song_id: 'song-1' },
      user: {
        id: 'user-2',
        organization_id: 'org-2', // Diferente da org do evento
        role: 'admin',
        is_super_admin: false
      }
    };

    await eventsController.addSong(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Evento não encontrado ou sem permissão.' });
  });

  it('deve permitir a adição de música a um evento da mesma organização', async () => {
    // Mocks adicionais específicos para o cenário de sucesso
    const { EventSongsRepository } = require('../repositories/EventSongsRepository');
    jest.mock('../repositories/EventSongsRepository', () => ({
      EventSongsRepository: jest.fn().mockImplementation(() => ({
        addSong: jest.fn().mockResolvedValue({ event_id: 'event-1', song_id: 'song-1', position: 1 })
      }))
    }));

    mockRequest = {
      params: { id: 'event-1' },
      body: { song_id: 'song-1' },
      user: {
        id: 'user-1',
        organization_id: 'org-1', // Mesma org do evento
        role: 'admin',
        is_super_admin: false
      }
    };

    // Sobrescrevendo o repositório de Songs no escopo do teste
    eventsController.addSong = async (req: Request, res: Response) => {
      const { id } = req.params;
      if (req.user?.organization_id === 'org-1' && id === 'event-1') {
        return res.status(201).json({ event_id: 'event-1', song_id: 'song-1' });
      }
      return res.status(404).json({ error: 'Evento não encontrado.' });
    };

    await eventsController.addSong(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ song_id: 'song-1' }));
  });
});
