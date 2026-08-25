import { Request, Response } from 'express';
import { createEventSchema, createScheduleSchema } from '../schemas/schedules.schema';
import { SchedulesRepository } from '../repositories/SchedulesRepository';
import { CreateScheduleService } from '../services/CreateScheduleService';

export class SchedulesController {
  // POST /schedules/events
  async createEvent(request: Request, response: Response): Promise<Response> {
    try {
      const validatedData = createEventSchema.parse(request.body);
      
      const schedulesRepository = new SchedulesRepository();
      const event = await schedulesRepository.createEvent(validatedData);

      return response.status(201).json(event);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return response.status(400).json({ error: 'Erro ao criar evento. Verifique os dados enviados.' });
    }
  }

  // POST /schedules
  async createSchedule(request: Request, response: Response): Promise<Response> {
    try {
      const validatedData = createScheduleSchema.parse(request.body);

      const createScheduleService = new CreateScheduleService();
      const schedule = await createScheduleService.execute(validatedData);

      return response.status(201).json(schedule);
    } catch (error: any) {
      console.error('Erro ao escalar usuário:', error);
      
      // Verifica se é erro de Foreign Key (usuário não existe, evento não existe ou skill não existe)
      if (error.code === '23503') {
        return response.status(400).json({ error: 'Erro de referência. O evento, usuário ou habilidade informada não existe no banco de dados.' });
      }

      return response.status(400).json({ error: error.message || 'Erro ao escalar usuário.' });
    }
  }
}