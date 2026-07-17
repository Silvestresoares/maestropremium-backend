import { SchedulesRepository, ScheduleRow } from '../repositories/SchedulesRepository';
import { AppError } from '../../../shared/errors/AppError';
import { CreateScheduleRawData } from '../schemas/schedules.schema';

export class CreateScheduleService {
  private schedulesRepository: SchedulesRepository;

  constructor() {
    this.schedulesRepository = new SchedulesRepository();
  }

  async execute({ event_id, user_id, skill_id }: CreateScheduleRawData): Promise<ScheduleRow> {
    // Regra de Negócio: Impedir duplicidade de voluntário na mesma função do evento
    const isDuplicate = await this.schedulesRepository.findDuplicate(event_id, user_id, skill_id);

    if (isDuplicate) {
      throw new AppError('Este voluntário já está escalado para essa mesma função neste evento.', 400);
    }

    const schedule = await this.schedulesRepository.createSchedule({ event_id, user_id, skill_id });
    return schedule;
  }
}
