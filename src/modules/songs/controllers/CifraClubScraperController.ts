import { Request, Response } from 'express';
import CifraClub from 'cifraclub-wrapper';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export class CifraClubScraperController {
  async search(request: Request, response: Response): Promise<Response> {
    const { q } = request.query;

    if (!q || typeof q !== 'string') {
      return response.status(400).json({ error: 'Parâmetro de busca "q" é obrigatório.' });
    }

    try {
      // Busca em paralelo no Cifra Club e no Cifras.com.br
      const [cifraClubRes, cifrasComBrRes] = await Promise.allSettled([
        // 1. Cifra Club
        CifraClub.search(q).then((results: any) =>
          (results || [])
            .filter((item: any) => item.path && !item.path.includes('undefined'))
            .map((item: any) => ({
              path: item.path,
              name: item.name,
              author: item.author,
              source: 'cifraclub'
            }))
        ),
        // 2. Cifras.com.br (API pública)
        fetch(`https://www.cifras.com.br/api/search?q=${encodeURIComponent(q)}`)
          .then(res => res.json())
          .then((data: any) =>
            (data?.songs?.hits || []).map((hit: any) => ({
              path: `${hit.COD_ARTISTA}/${hit.COD_TITULO}`,
              name: hit.TITULO,
              author: hit.ARTISTA,
              source: 'cifras'
            }))
          )
      ]);

      const ccResults = cifraClubRes.status === 'fulfilled' ? cifraClubRes.value : [];
      const cifrasResults = cifrasComBrRes.status === 'fulfilled' ? cifrasComBrRes.value : [];

      // Une os resultados
      const unifiedResults = [...ccResults, ...cifrasResults];

      return response.json(unifiedResults);
    } catch (error: any) {
      console.error('Erro na busca unificada de cifras:', error.message);
      return response.status(500).json({ error: 'Erro ao buscar dados de cifras.' });
    }
  }

  private async scrapeWithPuppeteer(songUrl: string): Promise<{ rawText: string; tone: string }> {
    let browser;

    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      chromium.setGraphicsMode = false;
      const puppeteerCore = require('puppeteer-core');
      browser = await puppeteerCore.launch({
        executablePath: await chromium.executablePath(),
        headless: true,
        args: [...chromium.args, '--font-render-hinting=none'],
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    }

    try {
      const page = await browser.newPage();

      // Bloqueia imagens, fontes e mídias para carregar super rápido (< 1s)
      await page.setRequestInterception(true);
      page.on('request', (req: any) => {
        const type = req.resourceType();
        if (
          ['image', 'stylesheet', 'font', 'media'].includes(type) ||
          req.url().includes('google') ||
          req.url().includes('doubleclick') ||
          req.url().includes('analytics')
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );

      await page.goto(songUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      await page.waitForSelector('pre', { timeout: 10000 });

      const html = await page.content();
      const $ = cheerio.load(html);

      const rawText = $('pre').text();
      let tone = $('[data-anchor="--chord-tone"]').text().trim();
      if (!tone) {
        tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
      }
      tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();

      return { rawText, tone };
    } finally {
      await browser.close();
    }
  }

  async scrape(request: Request, response: Response): Promise<Response> {
    const { path, source } = request.query;

    if (!path || typeof path !== 'string') {
      return response.status(400).json({ error: 'Parâmetro "path" é obrigatório.' });
    }

    const cleanPath = path.replace(/^\/+|\/+$/g, '');

    // 1. Extração do Cifras.com.br
    if (source === 'cifras') {
      const songUrl = `https://www.cifras.com.br/cifra/${cleanPath}`;

      try {
        let rawText = '';
        let tone = '';

        try {
          const res = await fetch(songUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
              'Referer': 'https://www.google.com/',
            },
          });

          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            rawText = $('pre').text();
          }
        } catch (fetchErr) {
          console.warn('Fetch direto no Cifras.com.br falhou, tentando fallback com Puppeteer...');
        }

        if (!rawText) {
          console.log(`[CifrasScraper]: Acionando Puppeteer para Cifras.com.br: ${songUrl}`);
          const pupResult = await this.scrapeWithPuppeteer(songUrl);
          rawText = pupResult.rawText;
        }

        if (!rawText) {
          return response.status(404).json({ error: 'Não foi possível encontrar a cifra no Cifras.com.br.' });
        }

        // Detecta o tom inicial a partir do primeiro acorde
        const firstChord = rawText.match(/\b([A-G][#b]?(?:m|M)?)\b/);
        tone = firstChord ? firstChord[1] : '';

        return response.json({
          raw_text: rawText,
          tone: tone,
        });
      } catch (error: any) {
        console.error('Erro ao extrair do Cifras.com.br:', error.message);
        return response.status(500).json({ error: 'Erro ao tentar baixar a cifra do Cifras.com.br.' });
      }
    }

    // 2. Extração do Cifra Club (com Puppeteer fallback)
    const songUrl = `https://www.cifraclub.com.br/${cleanPath}/`;

    try {
      let rawText = '';
      let tone = '';

      // Tenta primeiro via fetch direto
      try {
        const res = await fetch(songUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          rawText = $('pre').text();
          tone = $('[data-anchor="--chord-tone"]').text().trim();
          if (!tone) {
            tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
          }
          tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();
        }
      } catch (fetchErr) {
        console.warn('Fetch direto falhou, acionando fallback com Puppeteer...');
      }

      // Se o fetch tomou 403 (bloqueio de Cloudflare em datacenters como Render) ou não encontrou a cifra, usa Chromium real
      if (!rawText) {
        console.log(`[CifraClubScraper]: Acionando Puppeteer Chromium para contornar Cloudflare em: ${songUrl}`);
        const pupResult = await this.scrapeWithPuppeteer(songUrl);
        rawText = pupResult.rawText;
        tone = pupResult.tone;
      }

      if (!rawText) {
        return response.status(404).json({ error: 'Não foi possível encontrar a cifra na página fornecida.' });
      }

      return response.json({
        raw_text: rawText,
        tone: tone,
      });
    } catch (error: any) {
      console.error('Erro ao extrair cifra:', error.message);
      return response.status(500).json({ error: 'Erro ao tentar baixar a cifra.' });
    }
  }
}
