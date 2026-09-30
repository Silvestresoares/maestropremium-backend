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

  private async scrapeWithPuppeteer(url: string): Promise<{ rawText: string; tone: string }> {
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
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
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
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }

    try {
      const page = await browser.newPage();

      // Bloqueia imagens, fontes, stylesheets e mídias para carregar em ~1s
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

      // Oculta navigator.webdriver para contornar desafio do Cloudflare
      await page.evaluateOnNewDocument(() => {
        const nav = (globalThis as any).navigator;
        if (nav) {
          Object.defineProperty(nav, 'webdriver', { get: () => false });
        }
      });

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );

      const targetUrl = url.includes('imprimir.html') ? url : `${url.replace(/\/+$/, '')}/imprimir.html`;

      console.log(`[PuppeteerScraper]: Navegando para ${targetUrl}...`);
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      await page.waitForSelector('pre', { timeout: 4000 });

      const html = await page.content();
      const $ = cheerio.load(html);

      let rawText = $('pre').text();
      if (rawText) {
        rawText = rawText.replace(/Ocultar tablatura/gi, '').trim();
      }

      let tone = $('[data-anchor="--chord-tone"]').text().trim();
      if (!tone) {
        tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
      }
      tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();

      if (!tone && rawText) {
        const firstChord = rawText.match(/\b([A-G][#b]?(?:m|M)?)\b/);
        tone = firstChord ? firstChord[1] : '';
      }

      console.log(`[PuppeteerScraper]: Extração concluída! Tamanho: ${rawText.length}, Tom: "${tone}"`);
      return { rawText, tone };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  private async resolveCifraClubSlug(queryOrSlug: string): Promise<string | null> {
    try {
      const q = queryOrSlug.replace(/[-_]/g, ' ').replace(/\//g, ' ').trim();
      const res = await fetch(`https://solr.sscdn.co/cc/h2/?q=${encodeURIComponent(q)}&callback=`);
      if (!res.ok) return null;
      const text = (await res.text()).trim();
      const jsonStr = text.replace(/^[a-zA-Z0-9_]*\s*\(/, '').replace(/\);?$/, '');
      const data = JSON.parse(jsonStr);
      const docs = data?.response?.docs || [];
      const songDoc = docs.find((d: any) => d.d && d.u);
      if (songDoc) {
        return `${songDoc.d}/${songDoc.u}`;
      }
    } catch (e) {
      console.warn('[Scraper]: Erro ao resolver slug via Solr:', e);
    }
    return null;
  }

  async scrape(request: Request, response: Response): Promise<Response> {
    const { path, source } = request.query;

    if (!path || typeof path !== 'string') {
      return response.status(400).json({ error: 'Parâmetro "path" é obrigatório.' });
    }

    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    let printUrl = `https://www.cifraclub.com.br/${cleanPath}/imprimir.html`;
    const standardUrl = `https://www.cifraclub.com.br/${cleanPath}/`;
    const cifrasUrl = `https://www.cifras.com.br/cifra/${cleanPath}`;

    let rawText = '';
    let tone = '';

    // ==========================================
    // ESTRATÉGIA 1: FETCH RÁPIDO (DIRETO)
    // ==========================================
    if (source === 'cifras') {
      try {
        const res = await fetch(cifrasUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Referer': 'https://www.google.com/',
          },
        });
        console.log(`[Scraper]: Resposta Cifras.com.br para ${cleanPath} -> Status: ${res.status}`);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          rawText = $('pre').text();
        }
      } catch (err: any) {
        console.warn('[Scraper]: Fetch no Cifras.com.br falhou:', err?.message);
      }
    } else {
      // Cifra Club: tenta imprimir.html direto
      try {
        const res = await fetch(printUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        });
        console.log(`[Scraper]: Resposta Cifra Club imprimir.html para ${cleanPath} -> Status: ${res.status}`);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          rawText = $('pre').text();
          tone = $('[data-anchor="--chord-tone"]').text().trim();
          if (!tone) tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
          tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();
        }
      } catch (err: any) {
        console.warn('[Scraper]: Fetch no Cifra Club imprimir.html falhou:', err?.message);
      }
    }

    // =========================================================================
    // ESTRATÉGIA 2: RESOLUÇÃO INTELIGENTE DE SLUG VIA SOLR & FALLBACK CRUZADO
    // =========================================================================
    if (!rawText) {
      console.log(`[Scraper]: Tentativa inicial falhou para ${cleanPath}, tentando resolver slug via Solr do Cifra Club...`);
      const resolvedSlug = await this.resolveCifraClubSlug(cleanPath);
      if (resolvedSlug) {
        printUrl = `https://www.cifraclub.com.br/${resolvedSlug}/imprimir.html`;
        console.log(`[Scraper]: Slug resolvido: "${resolvedSlug}". Baixando ${printUrl}...`);
        try {
          const res = await fetch(printUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9',
            },
          });
          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            rawText = $('pre').text();
            tone = $('[data-anchor="--chord-tone"]').text().trim();
            if (!tone) tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
            tone = tone.replace(/Tom:\s*/i, '').split(/\s*\(/)[0].trim();
            console.log(`[Scraper]: Sucesso via Cifra Club Solr slug resolvido!`);
          }
        } catch (err: any) {
          console.warn('[Scraper]: Fetch no Cifra Club com slug resolvido falhou:', err?.message);
        }
      }
    }

    // Se ainda não achou e source era Cifra Club, tenta fallback no Cifras.com.br
    if (!rawText && source !== 'cifras') {
      try {
        const res = await fetch(cifrasUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Referer': 'https://www.google.com/',
          },
        });
        console.log(`[Scraper]: Fallback fetch Cifras.com.br para ${cleanPath} -> Status: ${res.status}`);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          rawText = $('pre').text();
        }
      } catch (err: any) {
        console.warn('[Scraper]: Fallback fetch no Cifras falhou:', err?.message);
      }
    }

    // =========================================================================
    // ESTRATÉGIA 3: PUPPETEER STEALTH (Contorna Cloudflare do Render em ~2s)
    // =========================================================================
    if (!rawText) {
      console.log(`[Scraper]: Fetch bloqueado por Cloudflare no Render, acionando Puppeteer Stealth para: ${printUrl}`);
      try {
        const pupResult = await this.scrapeWithPuppeteer(printUrl);
        rawText = pupResult.rawText;
        if (!tone) tone = pupResult.tone;
      } catch (pupErr: any) {
        console.warn('[Scraper]: Puppeteer Stealth falhou no printUrl:', pupErr?.message);
      }
    }

    // Se o path tiver "esse" ou "este", tenta a variação no Puppeteer (ex: Legião Urbana)
    if (!rawText && (cleanPath.includes('esse') || cleanPath.includes('este'))) {
      const altSlug = cleanPath.includes('esse')
        ? cleanPath.replace(/esse/g, 'este')
        : cleanPath.replace(/este/g, 'esse');
      const altPrintUrl = `https://www.cifraclub.com.br/${altSlug}/imprimir.html`;
      console.log(`[Scraper]: Tentando variação de slug com Puppeteer: ${altPrintUrl}`);
      try {
        const pupResult = await this.scrapeWithPuppeteer(altPrintUrl);
        rawText = pupResult.rawText;
        if (!tone) tone = pupResult.tone;
      } catch (altErr: any) {
        console.warn('[Scraper]: Puppeteer na variação de slug falhou:', altErr?.message);
      }
    }

    if (!rawText) {
      return response.status(404).json({ error: 'Não foi possível encontrar a cifra no Cifras.com.br nem no Cifra Club.' });
    }

    rawText = rawText.replace(/Ocultar tablatura/gi, '').trim();

    // Detecção aprimorada de tom quando a página não fornece a tag
    if (!tone) {
      const firstChordMatch = rawText.match(/\b([A-G][#b]?(?:m|M)?)(?:[0-9]|maj|dim|aug|sus|add|M|º|°)*(?:\/[A-G][#b]?)?/);
      tone = firstChordMatch ? firstChordMatch[1] : '';
    }

    return response.json({
      raw_text: rawText,
      tone: tone,
    });
  }
}

