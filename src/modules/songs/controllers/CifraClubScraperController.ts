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
      const validResults = (results || []).filter((item: any) => item.path && !item.path.includes('undefined'));

      return response.json(validResults);
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
      // Remove barras extras caso o path já venha com elas
      const cleanPath = path.replace(/^\/+|\/+$/g, '');
      const songUrl = `https://www.cifraclub.com.br/${cleanPath}/`;

      // O fetch nativo do Node contorna o bloqueio 403 do CifraClub
      const res = await fetch(songUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!res.ok) {
        return response.status(res.status).json({ error: `Cifra Club retornou status ${res.status}` });
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const rawText = $('pre').text();

      if (!rawText) {
        return response.status(404).json({ error: 'Não foi possível encontrar a cifra na página fornecida.' });
      }

      // Novo seletor do CifraClub para capturar o tom
      let tone = $('[data-anchor="--chord-tone"]').text().trim();
      if (!tone) {
        tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
      }
      // Se houver anotação como "Bbm (com forma de Am)", extrai apenas a primeira cifra
      tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();

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
