import { Router } from 'express';
import { SkillsController } from './controllers/SkillsController';
import { isAuthenticated } from '../../shared/infra/http/middlewares/isAuthenticated';

const skillsRoutes = Router();
const skillsController = new SkillsController();

// Leitura pública (para carregar opções em um select)
skillsRoutes.get('/', skillsController.list);
skillsRoutes.get('/:id', skillsController.show);

// Protegidas para administradores (ou qualquer pessoa autenticada, baseado na regra de negócios)
skillsRoutes.post('/', isAuthenticated, skillsController.create);
skillsRoutes.put('/:id', isAuthenticated, skillsController.update);
skillsRoutes.delete('/:id', isAuthenticated, skillsController.delete);

export { skillsRoutes };
