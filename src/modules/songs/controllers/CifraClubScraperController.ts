import { Request, Response } from 'express';
import CifraClub from 'cifraclub-wrapper';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class CifraClubScraperController {
  async search(request: Request, response: Response): Promise<Response> {
    const { q } = request.query;

    if (!q || typeof q !== 'string') {
      return response.status(400).json({ error: 'Parâmetro de busca "q" é obrigatório.' });
    }

    try {
      // Usa a biblioteca para buscar (ela utiliza o Akamai Solr nativo do CifraClub)
      const results = await CifraClub.search(q);
      
      return response.json(results);
    } catch (error: any) {
      console.error('Erro na busca do Cifra Club:', error.message);
      return response.status(500).json({ error: 'Erro ao buscar dados no Cifra Club.' });
    }
  }

  async scrape(request: Request, response: Response): Promise<Response> {
    const { path } = request.query;

    if (!path || typeof path !== 'string') {
      return response.status(400).json({ error: 'Parâmetro "path" é obrigatório.' });
    }

    try {
      const songUrl = `https://www.cifraclub.com.br/${path}/`;
      
      const res = await axios.get(songUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(res.data);
      
      const rawText = $('pre').text();
      let tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
      tone = tone.replace('Tom:', '').trim();

      if (!rawText) {
        return response.status(404).json({ error: 'Não foi possível encontrar a cifra na página fornecida.' });
      }

      return response.json({
        raw_text: rawText,
        tone: tone
      });
    } catch (error: any) {
      console.error('Erro ao extrair cifra:', error.message);
      return response.status(500).json({ error: 'Erro ao tentar baixar a cifra.' });
    }
  }
}
