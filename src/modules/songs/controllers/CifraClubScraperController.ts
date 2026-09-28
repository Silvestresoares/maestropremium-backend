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
      const qClean = q.trim();

      // Busca em paralelo no Cifra Club e no Cifras.com.br
      const [cifraClubRes, cifrasComBrRes] = await Promise.allSettled([
        // 1. Cifra Club
        CifraClub.search(qClean).then((results: any) =>
          (results || [])
            .filter((item: any) => item.path && !item.path.includes('undefined'))
            .map((item: any) => ({
              path: item.path,
              name: item.name,
              author: item.author,
              source: 'cifraclub'
            }))
        ),
        // 2. Cifras.com.br (com headers de navegador e tratamento defensivo)
        fetch(`https://www.cifras.com.br/api/search?q=${encodeURIComponent(qClean)}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.cifras.com.br/',
          }
        })
          .then(async res => {
            if (!res.ok) throw new Error(`Cifras search status: ${res.status}`);
            return res.json();
          })
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

      if (cifraClubRes.status === 'rejected') {
        console.error('Cifra Club search failed:', cifraClubRes.reason);
      }
      if (cifrasComBrRes.status === 'rejected') {
        console.error('Cifras.com.br search failed:', cifrasComBrRes.reason);
      }

      console.log(`[Search]: Encontrados ${ccResults.length} do Cifra Club e ${cifrasResults.length} do Cifras.com.br`);

      // Intercala os resultados para que opções de ambas as fontes apareçam logo no topo
      const unifiedResults: any[] = [];
      const maxLength = Math.max(ccResults.length, cifrasResults.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < ccResults.length) unifiedResults.push(ccResults[i]);
        if (i < cifrasResults.length) unifiedResults.push(cifrasResults[i]);
      }

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
        args: [
          ...chromium.args,
          '--font-render-hinting=none',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled'
        ],
      });
    }

    try {
      const page = await browser.newPage();

      // Bloqueia imagens, fontes e mídias para carregar em milissegundos
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
        timeout: 5000,
      });

      await page.waitForSelector('pre', { timeout: 4000 });

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
      if (browser) {
        await browser.close().catch(() => {});
      }
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

        // Tenta buscar no Cifras.com.br
        try {
          const res = await fetch(songUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'Referer': 'https://www.google.com/',
            },
          });

          console.log(`[CifrasScraper]: Resposta do Cifras.com.br para ${songUrl} -> Status: ${res.status}`);

          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            rawText = $('pre').text();
          }
        } catch (fetchErr: any) {
          console.warn('[CifrasScraper]: Fetch direto no Cifras.com.br falhou:', fetchErr?.message);
        }

        // Se falhou no Cifras (ex: bloqueio Cloudflare 403 de datacenter no Render), tenta fallback automático no Cifra Club
        if (!rawText) {
          console.log(`[CifrasScraper]: Cifras sem texto (ou 403 de datacenter), acionando fallback automático no Cifra Club: ${cleanPath}`);
          try {
            const ccRes = await fetch(`https://www.cifraclub.com.br/${cleanPath}/imprimir.html`, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
              },
            });

            console.log(`[CifrasScraper]: Resposta do fallback Cifra Club imprimir.html -> Status: ${ccRes.status}`);

            if (ccRes.ok) {
              const html = await ccRes.text();
              const $ = cheerio.load(html);
              rawText = $('pre').text();
              tone = $('[data-anchor="--chord-tone"]').text().trim();
              if (!tone) tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
              tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();
              console.log(`[CifrasScraper]: Sucesso no fallback Cifra Club! (${rawText.length} caracteres, Tom: "${tone}")`);
            }
          } catch (ccErr: any) {
            console.warn('[CifrasScraper]: Fallback no Cifra Club falhou:', ccErr?.message);
          }
        }

        if (!rawText) {
          return response.status(404).json({ error: 'Não foi possível encontrar a cifra no Cifras.com.br nem no Cifra Club.' });
        }

        rawText = rawText.replace(/Ocultar tablatura/gi, '').trim();

        if (!tone) {
          const firstChord = rawText.match(/\b([A-G][#b]?(?:m|M)?)\b/);
          tone = firstChord ? firstChord[1] : '';
        }

        return response.json({
          raw_text: rawText,
          tone: tone,
        });
      } catch (error: any) {
        console.error('Erro ao extrair do Cifras.com.br:', error.message);
        return response.status(500).json({ error: 'Erro ao tentar baixar a cifra do Cifras.com.br.' });
      }
    }

    // 2. Extração do Cifra Club
    const printUrl = `https://www.cifraclub.com.br/${cleanPath}/imprimir.html`;
    const standardUrl = `https://www.cifraclub.com.br/${cleanPath}/`;

    try {
      let rawText = '';
      let tone = '';

      // TENTATIVA 1: Versão de Impressão (imprimir.html)
      // É servida diretamente pelo CifraClub sem desafio Cloudflare Turnstile e responde em < 100ms
      try {
        const res = await fetch(printUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        });

        console.log(`[CifraClubScraper]: Resposta do Cifra Club imprimir.html -> Status: ${res.status}`);

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          rawText = $('pre').text();
          tone = $('[data-anchor="--chord-tone"]').text().trim();
          if (!tone) {
            tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
          }
          tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();
          console.log(`[CifraClubScraper]: Sucesso via imprimir.html! (${rawText.length} caracteres, Tom: "${tone}")`);
        }
      } catch (printErr: any) {
        console.warn('[CifraClubScraper]: Tentativa via imprimir.html falhou:', printErr?.message);
      }

      // TENTATIVA 2: URL Normal do Cifra Club via fetch direto
      if (!rawText) {
        try {
          const res = await fetch(standardUrl, {
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
          console.warn('Fetch direto na URL padrão falhou...');
        }
      }

      // TENTATIVA 3: Fallback Automático Cruzado para Cifras.com.br
      // Se o CifraClub bloqueou por Cloudflare no Render, busca a mesma música no Cifras.com.br
      if (!rawText) {
        console.log(`[CifraClubScraper]: Cifra Club inacessível, acionando fallback automático no Cifras.com.br para: ${cleanPath}`);
        try {
          const cifrasRes = await fetch(`https://www.cifras.com.br/cifra/${cleanPath}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'Referer': 'https://www.google.com/',
            },
          });

          if (cifrasRes.ok) {
            const html = await cifrasRes.text();
            const $ = cheerio.load(html);
            rawText = $('pre').text();
            if (rawText) {
              rawText = rawText.replace(/Ocultar tablatura/gi, '').trim();
              if (!tone) {
                const firstChord = rawText.match(/\b([A-G][#b]?(?:m|M)?)\b/);
                tone = firstChord ? firstChord[1] : '';
              }
            }
          }
        } catch (cifrasErr) {
          console.warn('Fallback cruzado para Cifras.com.br falhou:', cifrasErr);
        }
      }

      // TENTATIVA 4: Puppeteer com timeout rígido de 5s (apenas se tudo falhar)
      if (!rawText) {
        try {
          console.log(`[CifraClubScraper]: Acionando Puppeteer Chromium como último recurso: ${printUrl}`);
          const pupResult = await this.scrapeWithPuppeteer(printUrl);
          rawText = pupResult.rawText;
          if (!tone) tone = pupResult.tone;
        } catch (pupErr: any) {
          console.warn('Puppeteer também falhou:', pupErr?.message);
        }
      }

      if (!rawText) {
        return response.status(404).json({ error: 'Não foi possível encontrar a cifra no Cifra Club nem no Cifras.com.br.' });
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
