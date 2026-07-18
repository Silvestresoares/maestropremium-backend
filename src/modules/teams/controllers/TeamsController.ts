import { Request, Response } from 'express';
import { TeamsRepository } from '../repositories/TeamsRepository';
import { AppError } from '../../../shared/errors/AppError';

export class TeamsController {
  async create(request: Request, response: Response): Promise<Response> {
    const { name } = request.body;
    const currentUser = (request as any).user;

    if (!name) {
      throw new AppError('O nome da equipe é obrigatório.');
    }

    const repository = new TeamsRepository();
    const team = await repository.create(name, currentUser.organization_id);

    return response.status(201).json(team);
  }

  async index(request: Request, response: Response): Promise<Response> {
    const currentUser = (request as any).user;
    const repository = new TeamsRepository();
    
    const teams = await repository.findAll(currentUser.organization_id);
    
    // Buscar membros para cada equipe (pode ser otimizado no futuro com JOIN, mas assim funciona para volume baixo)
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await repository.getMembers(team.id);
        return { ...team, members };
      })
    );

    return response.json(teamsWithMembers);
  }

  async update(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { name } = request.body;
    const currentUser = (request as any).user;

    if (!name) {
      throw new AppError('O nome da equipe é obrigatório.');
    }

    const repository = new TeamsRepository();
    const team = await repository.findById(id, currentUser.organization_id);

    if (!team) {
      throw new AppError('Equipe não encontrada ou não pertence a esta organização.', 404);
    }

    const updatedTeam = await repository.update(id, name, currentUser.organization_id);

    return response.json(updatedTeam);
  }

  async delete(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const currentUser = (request as any).user;

    const repository = new TeamsRepository();
    await repository.delete(id, currentUser.organization_id);

    return response.status(204).send();
  }

  // --- Membros ---

  async addMember(request: Request, response: Response): Promise<Response> {
    const { id: team_id } = request.params;
    const { user_id, assignment } = request.body;
    const currentUser = (request as any).user;

    if (!user_id || !assignment) {
      throw new AppError('user_id e assignment são obrigatórios.');
    }

    const repository = new TeamsRepository();
    const team = await repository.findById(team_id, currentUser.organization_id);
    if (!team) {
      throw new AppError('Equipe não encontrada.', 404);
    }

    await repository.addMember(team_id, user_id, assignment);

    return response.status(201).json({ message: 'Membro adicionado com sucesso.' });
  }

  async removeMember(request: Request, response: Response): Promise<Response> {
    const { id: team_id, userId: user_id } = request.params;
    const currentUser = (request as any).user;

    const repository = new TeamsRepository();
    const team = await repository.findById(team_id, currentUser.organization_id);
    if (!team) {
      throw new AppError('Equipe não encontrada.', 404);
    }

    await repository.removeMember(team_id, user_id);

    return response.status(204).send();
  }
}
