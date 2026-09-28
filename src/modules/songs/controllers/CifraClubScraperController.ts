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
      // Usa a biblioteca para buscar (ela utiliza o Akamai Solr nativo do CifraClub)
      const results = await CifraClub.search(q);
      const validResults = (results || []).filter((item: any) => item.path && !item.path.includes('undefined'));

      return response.json(validResults);
    } catch (error: any) {
      console.error('Erro na busca do Cifra Club:', error.message);
      return response.status(500).json({ error: 'Erro ao buscar dados no Cifra Club.' });
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
    const { path } = request.query;

    if (!path || typeof path !== 'string') {
      return response.status(400).json({ error: 'Parâmetro "path" é obrigatório.' });
    }

    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const songUrl = `https://www.cifraclub.com.br/${cleanPath}/`;

    try {
      let rawText = '';
      let tone = '';

      // 1. Tenta primeiro via fetch direto
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

      // 2. Se o fetch tomou 403 (bloqueio de Cloudflare em datacenters como Render) ou não encontrou a cifra, usa Chromium real
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
