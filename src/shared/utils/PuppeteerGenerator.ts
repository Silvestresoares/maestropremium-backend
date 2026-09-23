import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export class PuppeteerGenerator {
  static async generatePdf(url: string): Promise<Buffer> {
    console.log(`Starting Puppeteer for URL: ${url}`);

    let browser;

    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      // Configuração para produção (Render, AWS, etc) usando puppeteer-core + sparticuz
      chromium.setGraphicsMode = false;
      const puppeteerCore = require('puppeteer-core');
      browser = await puppeteerCore.launch({
        executablePath: await chromium.executablePath(),
        headless: true,
        args: [...chromium.args, '--font-render-hinting=none'],
      });
    } else {
      // Configuração para desenvolvimento local (Windows, Mac, Linux) usando pacote puppeteer completo
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    try {
      const page = await browser.newPage();

      // Navigate to the provided URL (which should be the print template)
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for the specific element that indicates loading is finished.
      // PrintTemplate.tsx removes the #print-loading div when finished loading.
      await page.waitForSelector('#pdf-chart-container', { timeout: 10000 });

      if (url.includes('tab=partitura')) {
        // A partitura (AlphaTab/OSMD) requer um tempo para renderizar o Canvas/SVG.
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // We inject CSS directly via Puppeteer to handle the specific layout requirements
      // similar to what we did in the iframe approach, but now in the backend.
      await page.addStyleTag({
        content: `
                    @page {
            size: A4 portrait;
            margin: 6mm 8mm; /* Margens otimizadas para folha A4 */
          }
          html {
            font-size: 11px !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Oculta controles de tela, botões e telas de desenho */
          .no-print,
          .auto-scroll-controls, 
          [data-html2canvas-ignore="true"],
          canvas {
            display: none !important;
          }

          /* Remove o padding externo de 2rem que empurrava a folha */
          .chart-viewer {
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Cabeçalho mais compacto para não empurrar a música */
          .chart-viewer > div:first-of-type {
            margin-bottom: 0.5rem !important;
            padding-bottom: 0.4rem !important;
          }
          .chart-viewer img {
            height: 48px !important; /* Reduz altura do logo de 90px para 48px */
          }
          .chart-viewer h1 {
            font-size: 1.5rem !important;
          }
          .chart-viewer h2 {
            font-size: 0.95rem !important;
          }

          /* Linha de Estrutura enxuta */
          div[style*="marginBottom: 2.5rem"],
          div[style*="margin-bottom: 2.5rem"] {
            margin-bottom: 0.6rem !important;
          }

          /* Distribuição real em 2 Colunas lado a lado */
          .chart-columns {
            display: flex !important;
            flex-direction: row !important;
            gap: 1.5rem !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          .chart-columns > div {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          /* Espaçamento entre estrofes/refrões */
          div[id^="section-"] {
            margin-bottom: 0.8rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Acordes e Letra ajustados para leitura confortável */
          .chord-line {
            font-size: 1.25rem !important;
            margin-bottom: 0 !important;
          }
          .lyric-line {
            font-size: 1.25rem !important;
            min-height: 1.4rem !important;
          }
          .song-line {
            margin-top: 0.2rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

        `
      });

      // Normalize DOM logic in Puppeteer to convert mirrored layout to left-aligned flow
      await page.evaluate(`
        const sections = document.querySelectorAll('div[id^="section-"]');
        sections.forEach(section => {
          if (section.style.justifyContent === 'flex-end') {
            section.style.justifyContent = 'flex-start';
            section.style.borderLeft = section.style.borderRight;
            section.style.borderRight = 'none';
            section.style.paddingLeft = section.style.paddingRight;
            section.style.paddingRight = '0';
            section.style.marginLeft = section.style.marginRight;
            section.style.marginRight = '0';
          }
          
          const contentBox = Array.from(section.children).find(child => child.style.flex === '1 1 0%' || child.style.flex === '1');
          if (contentBox) {
            const rightBorder = contentBox.style.borderRight;
            if (rightBorder && rightBorder !== 'none' && rightBorder !== '') {
              contentBox.style.borderLeft = rightBorder;
              contentBox.style.borderRight = 'none';
              contentBox.style.paddingLeft = contentBox.style.paddingRight;
              contentBox.style.paddingRight = '0';
            }
            
            if (contentBox.nextElementSibling) {
              const rightTitle = contentBox.nextElementSibling;
              rightTitle.style.marginLeft = '0';
              rightTitle.style.marginRight = '0.2rem';
              section.insertBefore(rightTitle, contentBox);
            }
          }
        });
      `);

      // Give a tiny bit of time for DOM changes to settle and fonts to render perfectly
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        pageRanges: '1'
      });

      // Puppeteer returns a Uint8Array, we convert to Buffer
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
