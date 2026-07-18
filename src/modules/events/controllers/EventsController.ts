import { Request, Response } from 'express';
import { EventsRepository } from '../repositories/EventsRepository';
import { EventSongsRepository } from '../repositories/EventSongsRepository';
import { EventTeamRepository } from '../repositories/EventTeamRepository';

export class EventsController {
  async create(req: Request, res: Response) {
    try {
      const { title, description, date_time } = req.body;

      if (!title || !date_time) {
        return res.status(400).json({ error: 'Título e Data/Hora são obrigatórios.' });
      }

      const currentUser = (req as any).user;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.create({ title, description, date_time, organization_id: currentUser?.organization_id });

      return res.status(201).json(event);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao criar o evento.' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const eventsRepository = new EventsRepository();
      
      // Garanti aqui a chamada ao método .list() que criamos no repositório
      const events = await eventsRepository.list(currentUser?.organization_id);

      return res.status(200).json(events);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro interno ao listar os eventos.' });
    }
  }
  async show(req: Request, res: Response) {
    try {
      // Captura o ID que foi enviado na URL da rota
      const { id } = req.params;

      const currentUser = (req as any).user;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);

      // Se o banco não encontrar nenhum evento com esse ID
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // Se encontrou, retorna o evento com status 200 OK
      return res.status(200).json(event);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao buscar o evento.' });
    }
  }
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const currentUser = (req as any).user;
      const eventsRepository = new EventsRepository();
      
      // 1. Verifica se o evento realmente existe antes de tentar deletar
      const event = await eventsRepository.findById(id, currentUser?.organization_id);

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // 2. Se existe, deleta
      await eventsRepository.delete(id, currentUser?.organization_id);

      // Status 204 é o padrão ideal para exclusões bem-sucedidas
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao deletar o evento.' });
    }
  }
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, date_time } = req.body;

      // 1. Validação dos campos
      if (!title || !date_time) {
        return res.status(400).json({ error: 'Título e Data/Hora são obrigatórios.' });
      }

      const currentUser = (req as any).user;
      const eventsRepository = new EventsRepository();

      // 2. Verifica se o evento realmente existe no banco
      const eventExists = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!eventExists) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // 3. Executa a atualização
      const updatedEvent = await eventsRepository.update(id, { title, description, date_time, organization_id: currentUser?.organization_id });

      // Retorna o evento atualizado com status 200 OK
      return res.status(200).json(updatedEvent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao atualizar o evento.' });
    }
  }

  async addSong(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { song_id } = req.body;

      if (!song_id) {
        return res.status(400).json({ error: 'O ID da música é obrigatório.' });
      }

      const eventSongsRepository = new EventSongsRepository();
      const eventSong = await eventSongsRepository.addSong(id, song_id);
      
      return res.status(201).json(eventSong);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar música ao evento.' });
    }
  }

  async removeSong(req: Request, res: Response) {
    try {
      const { id, songId } = req.params;

      const eventSongsRepository = new EventSongsRepository();
      await eventSongsRepository.removeSong(id, songId);
      
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover música do evento.' });
    }
  }

  async reorderSongs(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { songIds } = req.body;

      if (!Array.isArray(songIds)) {
        return res.status(400).json({ error: 'songIds deve ser um array.' });
      }

      const eventSongsRepository = new EventSongsRepository();
      await eventSongsRepository.reorderSongs(id, songIds);
      
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reordenar músicas.' });
    }
  }

  async addTeamMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_id, assignment } = req.body;

      if (!user_id || !assignment) {
        return res.status(400).json({ error: 'ID do usuário e função são obrigatórios.' });
      }

      const eventTeamRepository = new EventTeamRepository();
      const teamMember = await eventTeamRepository.addTeamMember(id, user_id, assignment);
      
      return res.status(201).json(teamMember);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar membro à equipe.' });
    }
  }

  async removeTeamMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;

      const eventTeamRepository = new EventTeamRepository();
      await eventTeamRepository.removeTeamMember(id, userId);
      
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover membro da equipe.' });
    }
  }

  async applyTeam(req: Request, res: Response) {
    try {
      const { id } = req.params; // Event ID
      const { team_id } = req.body;
      const currentUser = (req as any).user;

      if (!team_id) {
        return res.status(400).json({ error: 'O ID da equipe é obrigatório.' });
      }

      // Check if event exists
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // Get team members (we use dynamic import to avoid circular dependencies if any, or just require it)
      const { TeamsRepository } = require('../../teams/repositories/TeamsRepository');
      const teamsRepository = new TeamsRepository();
      
      const team = await teamsRepository.findById(team_id, currentUser?.organization_id);
      if (!team) {
        return res.status(404).json({ error: 'Equipe fixa não encontrada.' });
      }

      const teamMembers = await teamsRepository.getMembers(team_id);
      
      if (teamMembers.length === 0) {
        return res.status(400).json({ error: 'A equipe selecionada não possui membros.' });
      }

      // Insert each member into the event_team table
      const eventTeamRepository = new EventTeamRepository();
      
      for (const member of teamMembers) {
        try {
          await eventTeamRepository.addTeamMember(id, member.user_id, member.assignment);
        } catch (err) {
          // Ignore duplicate constraint errors
          console.warn(`Membro ${member.user_id} já está na equipe ou erro:`, err);
        }
      }

      return res.status(200).json({ message: 'Equipe aplicada com sucesso.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao aplicar equipe fixa ao evento.' });
    }
  }
}