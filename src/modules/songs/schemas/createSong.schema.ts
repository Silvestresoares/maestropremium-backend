import { z } from 'zod';

export const createSongSchema = z.object({
  title: z.string({ required_error: 'O título da música é obrigatório' })
    .min(1, 'O título não pode estar vazio'),
  artist: z.string({ required_error: 'O nome do artista/ministério é obrigatório' })
    .min(1, 'O artista não pode estar vazio'),
  original_key: z.string({ required_error: 'O tom original é obrigatório' })
    .max(10, 'Formato de tom inválido'),
  chordpro_content: z.string({ required_error: 'O conteúdo em ChordPro é obrigatório' })
    .min(1, 'A cifra não pode estar vazia'),
  bpm: z.number().int().positive().optional().nullable(),
  time_signature: z.string().optional().default('4/4'), // Adicionado para cobrir o compasso musical (4/4, 6/8)
  youtube_url: z.string().url().optional().nullable(),
  spotify_url: z.string().url().optional().nullable(),
});

export type CreateSongRawData = z.infer<typeof createSongSchema>;