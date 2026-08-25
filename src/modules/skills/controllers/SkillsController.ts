import { Request, Response } from 'express';
import { SkillsRepository } from '../repositories/SkillsRepository';
import { createSkillSchema } from '../schemas/createSkill.schema';

export class SkillsController {
  async create(req: Request, res: Response) {
    try {
      const validatedData = createSkillSchema.parse(req.body);

      const skillsRepository = new SkillsRepository();
      const skill = await skillsRepository.create(validatedData);

      return res.status(201).json(skill);
    } catch (error) {
      console.error('Erro ao criar habilidade:', error);
      return res.status(400).json({ error: 'Erro ao criar habilidade. Verifique os dados enviados.' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const skillsRepository = new SkillsRepository();
      const skills = await skillsRepository.list();

      return res.status(200).json(skills);
    } catch (error) {
      console.error('Erro ao listar habilidades:', error);
      return res.status(500).json({ error: 'Erro interno ao listar as habilidades.' });
    }
  }

  async show(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skillsRepository = new SkillsRepository();
      const skill = await skillsRepository.findById(id);

      if (!skill) {
        return res.status(404).json({ error: 'Habilidade não encontrada.' });
      }

      return res.status(200).json(skill);
    } catch (error) {
      console.error('Erro ao buscar habilidade:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar a habilidade.' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createSkillSchema.parse(req.body);

      const skillsRepository = new SkillsRepository();
      const skillExists = await skillsRepository.findById(id);

      if (!skillExists) {
        return res.status(404).json({ error: 'Habilidade não encontrada.' });
      }

      const updatedSkill = await skillsRepository.update(id, validatedData);

      return res.status(200).json(updatedSkill);
    } catch (error) {
      console.error('Erro ao atualizar habilidade:', error);
      return res.status(400).json({ error: 'Erro ao atualizar habilidade.' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skillsRepository = new SkillsRepository();
      
      const skillExists = await skillsRepository.findById(id);

      if (!skillExists) {
        return res.status(404).json({ error: 'Habilidade não encontrada.' });
      }

      await skillsRepository.delete(id);

      return res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao deletar habilidade:', error);
      // Se houver restrição de foreign key, não podemos deletar se alguém está escalado com essa habilidade
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Não é possível deletar esta habilidade porque existem pessoas escaladas com ela.' });
      }
      return res.status(500).json({ error: 'Erro interno ao deletar a habilidade.' });
    }
  }
}
