import { Request, Response } from 'express';
import { EventsRepository } from '../repositories/EventsRepository';
import { EventSongsRepository } from '../repositories/EventSongsRepository';
import { EventTeamRepository } from '../repositories/EventTeamRepository';
import { EventAttachmentsRepository } from '../repositories/EventAttachmentsRepository';
import { NotificationService } from '../../notifications/services/NotificationService';

export class EventsController {
  async create(req: Request, res: Response) {
    try {
      const { title, description, date_time } = req.body;

      if (!title || !date_time) {
        return res.status(400).json({ error: 'Título e Data/Hora são obrigatórios.' });
      }

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.create({ title, description, date_time, organization_id: currentUser?.organization_id });

      // Dispara notificação push
      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        notificationService.sendToOrganization(currentUser.organization_id, {
          title: 'Novo Evento Agendado!',
          body: `O evento "${title}" foi criado e está na agenda.`,
          url: `/events/${event.id}`
        }).catch(err => console.error('Erro ao notificar:', err));
      }

      return res.status(201).json(event);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao criar o evento.' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const currentUser = req.user!;
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

      const currentUser = req.user!;
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

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      
      // 1. Verifica se o evento realmente existe antes de tentar deletar
      const event = await eventsRepository.findById(id, currentUser?.organization_id);

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // 2. Se existe, deleta
      await eventsRepository.delete(id, currentUser?.organization_id);

      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        notificationService.sendToOrganization(currentUser.organization_id, {
          title: 'Evento Cancelado',
          body: `O evento "${event.title}" foi cancelado/excluído.`,
          url: '/dashboard'
        }).catch(err => console.error('Erro ao notificar:', err));
      }

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

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();

      // 2. Verifica se o evento realmente existe no banco
      const eventExists = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!eventExists) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      // 3. Executa a atualização
      const updatedEvent = await eventsRepository.update(id, { title, description, date_time, organization_id: currentUser?.organization_id });

      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        
        let updateType = 'Detalhes Alterados';
        const newDate = new Date(date_time).getTime();
        const oldDate = new Date(eventExists.date_time).getTime();
        
        if (newDate !== oldDate) {
          updateType = 'Horário Alterado';
        }

        notificationService.sendToOrganization(currentUser.organization_id, {
          title: `Evento Atualizado: ${updateType}`,
          body: `O evento "${updatedEvent.title}" sofreu alterações.`,
          url: `/events/${updatedEvent.id}`
        }).catch(err => console.error('Erro ao notificar:', err));
      }

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

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
      }

      const eventSongsRepository = new EventSongsRepository();
      const eventSong = await eventSongsRepository.addSong(id, song_id);
      
      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        notificationService.sendToOrganization(currentUser.organization_id, {
          title: 'Mudança no Repertório',
          body: `Uma nova música foi adicionada ao evento "${event.title}".`,
          url: `/events/${id}`
        }).catch(err => console.error('Erro ao notificar:', err));
      }

      return res.status(201).json(eventSong);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar música ao evento.' });
    }
  }

  async removeSong(req: Request, res: Response) {
    try {
      const { id, songId } = req.params;

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
      }

      const eventSongsRepository = new EventSongsRepository();
      await eventSongsRepository.removeSong(id, songId);
      
      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        notificationService.sendToOrganization(currentUser.organization_id, {
          title: 'Mudança no Repertório',
          body: `Uma música foi removida do evento "${event.title}".`,
          url: `/events/${id}`
        }).catch(err => console.error('Erro ao notificar:', err));
      }

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

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
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

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
      }

      const eventTeamRepository = new EventTeamRepository();
      const teamMember = await eventTeamRepository.addTeamMember(id, user_id, assignment);
      
      if (currentUser?.organization_id) {
        const notificationService = new NotificationService();
        notificationService.sendToUser(user_id, {
          title: 'Nova Escalação',
          body: `Você foi escalado para o evento "${event.title}".`,
          url: `/events/${id}`
        }).catch(err => console.error('Erro ao notificar:', err));
      }

      return res.status(201).json(teamMember);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar membro à equipe.' });
    }
  }

  async removeTeamMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;

      const currentUser = req.user!;
      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado ou sem permissão.' });
      }

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
      const currentUser = req.user!;

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

      // Insert all members into the event_team table in a single transaction
      const eventTeamRepository = new EventTeamRepository();
      
      await eventTeamRepository.applyTeamTransactional(id, teamMembers);
      
      // Notify them async
      const notificationService = new NotificationService();
      for (const member of teamMembers) {
        notificationService.sendToUser(member.user_id, {
          title: 'Nova Escalação',
          body: `Você foi escalado para o evento "${event.title}".`,
          url: `/events/${id}`
        }).catch(err => console.warn(`Erro ao notificar ${member.user_id}:`, err));
      }

      return res.status(200).json({ message: 'Equipe aplicada com sucesso.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao aplicar equipe fixa ao evento.' });
    }
  }

  async uploadAttachment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;
      const currentUser = req.user!;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const eventsRepository = new EventsRepository();
      const event = await eventsRepository.findById(id, currentUser?.organization_id);
      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado.' });
      }

      const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
      let type = 'unknown';
      if (extension === 'pdf') type = 'pdf';
      else if (extension === 'txt') type = 'txt';
      else if (extension.match(/^(doc|docx)$/)) type = 'doc';

      const eventAttachmentsRepository = new EventAttachmentsRepository();
      const attachment = await eventAttachmentsRepository.addAttachment(
        id,
        file.originalname,
        file.path, // URL do cloudinary
        type,
        currentUser.organization_id
      );

      return res.status(201).json(attachment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao fazer upload do anexo.' });
    }
  }

  async removeAttachment(req: Request, res: Response) {
    try {
      const { id, attachmentId } = req.params;
      const currentUser = req.user!;

      const eventAttachmentsRepository = new EventAttachmentsRepository();
      
      const attachment = await eventAttachmentsRepository.findById(attachmentId, currentUser.organization_id);
      if (!attachment || attachment.event_id !== id) {
        return res.status(404).json({ error: 'Anexo não encontrado.' });
      }

      await eventAttachmentsRepository.removeAttachment(attachmentId, id, currentUser.organization_id);

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover anexo.' });
    }
  }
}