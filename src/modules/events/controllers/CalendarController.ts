import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import * as ics from 'ics';
import { EventAttributes } from 'ics';

export class CalendarController {
  async getFeed(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const query = `
        SELECT e.id, e.title, e.description, e.date_time 
        FROM events e
        INNER JOIN event_team et ON e.id = et.event_id
        WHERE et.user_id = $1
        ORDER BY e.date_time ASC;
      `;
      const { rows } = await pool.query(query, [userId]);

      const calendarEvents: EventAttributes[] = rows.map((event: any) => {
        const date = new Date(event.date_time);
        return {
          start: [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes()
          ],
          duration: { hours: 2, minutes: 0 },
          title: event.title,
          description: event.description
            ? event.description + '\n\nAcesse o Tom & Ordem para ver o repertorio.'
            : 'Acesse o Tom & Ordem para ver o repertorio e os arquivos da liturgia.',
          location: 'Igreja',
          url: `https://maestro-cifras.com.br/dashboard/events/${event.id}`,
          status: 'CONFIRMED',
          busyStatus: 'BUSY'
        } as EventAttributes;
      });

      if (calendarEvents.length === 0) {
        calendarEvents.push({
          start: [2000, 1, 1, 0, 0],
          title: 'Calendario Criado',
          description: 'Nenhum evento agendado ainda.',
          duration: { minutes: 1 }
        });
      }

      const { error, value } = ics.createEvents(calendarEvents);

      if (error || !value) {
        console.error('Erro ao gerar ICS:', error);
        return res.status(500).json({ error: 'Erro ao gerar o feed do calendario' });
      }

      res.set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="maestro-cifras-${userId}.ics"`,
      });

      return res.send(value);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao processar o calendario' });
    }
  }
}