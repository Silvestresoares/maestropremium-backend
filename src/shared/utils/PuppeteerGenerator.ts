import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export class PuppeteerGenerator {
  static async generatePdf(url: string, styleParam?: string, columnsParam?: string | number): Promise<Buffer> {
    console.log(`Starting Puppeteer for URL: ${url}`);

    const isClassic = styleParam === 'classic' || url.includes('style=classic');
    const isSingleColumn = String(columnsParam) === '1' || url.includes('columns=1');

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

      if (isClassic) {
        // ESTILO CLÁSSICO (Tradicional de cancioneiro com títulos horizontais e cabeçalho limpo)
        await page.addStyleTag({
          content: `
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            html {
              font-size: 11px !important;
            }
            body {
              background: white !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            }
            * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .no-print,
            .auto-scroll-controls, 
            [data-html2canvas-ignore="true"],
            canvas,
            button svg {
              display: none !important;
            }

            .chart-viewer {
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }

            .chart-viewer > div:first-of-type {
              margin-bottom: 0.8rem !important;
              padding-bottom: 0.5rem !important;
              border-bottom: 1.5px solid #e2e8f0 !important;
            }
            .chart-viewer img {
              height: 38px !important;
            }
            .chart-viewer h1 {
              font-size: 1.6rem !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              letter-spacing: -0.5px !important;
            }
            .chart-viewer h2 {
              font-size: 0.95rem !important;
              color: #64748b !important;
              font-weight: 500 !important;
              margin-top: 0.1rem !important;
            }

            .chart-viewer select {
              appearance: none !important;
              -webkit-appearance: none !important;
              background: transparent !important;
              border: none !important;
              padding: 0 !important;
              font-weight: 700 !important;
              color: #0f172a !important;
              font-size: 0.85rem !important;
            }
            .chart-viewer button {
              border: none !important;
              background: transparent !important;
              padding: 0 !important;
              color: #0f172a !important;
              box-shadow: none !important;
              font-weight: 700 !important;
              font-size: 0.85rem !important;
            }

            div[style*="marginBottom: 2.5rem"],
            div[style*="margin-bottom: 2.5rem"] {
              margin-bottom: 0.8rem !important;
              font-size: 0.8rem !important;
              opacity: 0.85;
            }

            ${isSingleColumn ? `
            .chart-columns {
              display: flex !important;
              flex-direction: column !important;
              gap: 1.2rem !important;
              width: 100% !important;
            }
            .chart-columns > div {
              display: flex !important;
              flex-direction: column !important;
              width: 100% !important;
              min-width: 100% !important;
            }
            ` : `
            .chart-columns {
              display: flex !important;
              flex-direction: row !important;
              gap: 2rem !important;
              align-items: flex-start !important;
              width: 100% !important;
            }
            .chart-columns > div {
              display: flex !important;
              flex-direction: column !important;
              flex: 1 !important;
              min-width: 0 !important;
            }
            `}

            div[id^="section-"] {
              display: flex !important;
              flex-direction: column !important;
              margin-bottom: 1rem !important;
              border-left: none !important;
              border-right: none !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            div[id^="section-"] > div:first-child {
              width: 100% !important;
              min-width: 100% !important;
              height: auto !important;
              position: static !important;
              display: block !important;
              margin-bottom: 0.25rem !important;
            }

            div[id^="section-"] h3 {
              position: static !important;
              transform: none !important;
              writing-mode: horizontal-tb !important;
              visibility: visible !important;
              font-size: 0.8rem !important;
              font-weight: 700 !important;
              letter-spacing: 0.5px !important;
              text-transform: uppercase !important;
              display: inline-block !important;
            }

            div[id^="section-"] h3[style*="visibility: hidden"] {
              display: none !important;
            }

            div[id^="section-"] > div[style*="flex: 1"],
            div[id^="section-"] > div[style*="flex: 1 1"] {
              border-left: none !important;
              border-right: none !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }

            .chord-line {
              font-size: 1.15rem !important;
              font-weight: 700 !important;
              margin-bottom: 0.05rem !important;
            }

            .lyric-line {
              font-size: 1.15rem !important;
              min-height: 1.35rem !important;
              line-height: 1.4 !important;
            }
            .song-line {
              margin-top: 0.15rem !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          `
        });

        await page.evaluate(`
          const sections = document.querySelectorAll('div[id^="section-"]');
          sections.forEach(section => {
            // Remove o h3 clone invisível
            const hiddenH3 = section.querySelector('h3[style*="visibility"]');
            if (hiddenH3) hiddenH3.remove();

            // Formata o título visível com colchetes e remove rotações
            const visibleH3 = section.querySelector('h3');
            if (visibleH3) {
              const raw = visibleH3.textContent.trim();
              if (raw && !raw.startsWith('[')) {
                visibleH3.textContent = '[' + raw + ']';
              }
              visibleH3.style.position = 'static';
              visibleH3.style.transform = 'none';
              visibleH3.style.writingMode = 'horizontal-tb';
              visibleH3.style.whiteSpace = 'normal';
              visibleH3.style.display = 'inline-block';
              visibleH3.style.fontSize = '0.85rem';
              visibleH3.style.fontWeight = '700';
              visibleH3.style.marginBottom = '0.35rem';
            }

            // Remove barras verticais laterais e zera larguras restritas de todos os filhos
            Array.from(section.children).forEach(child => {
              child.style.width = '100%';
              child.style.minWidth = '100%';
              child.style.borderLeft = 'none';
              child.style.borderRight = 'none';
              child.style.paddingLeft = '0';
              child.style.paddingRight = '0';
              child.style.marginLeft = '0';
              child.style.marginRight = '0';
            });

            // Estiliza a seção como bloco vertical
            section.style.display = 'flex';
            section.style.flexDirection = 'column';
            section.style.borderLeft = 'none';
            section.style.borderRight = 'none';
            section.style.paddingLeft = '0';
            section.style.paddingRight = '0';
            section.style.marginLeft = '0';
            section.style.marginRight = '0';
            section.style.marginBottom = '1.2rem';
          });

          // Limpa botões de play e setas de dropdown do cabeçalho
          document.querySelectorAll('.chart-viewer button svg').forEach(svg => svg.remove());
          document.querySelectorAll('.chart-viewer select').forEach(sel => {
            sel.style.border = 'none';
            sel.style.background = 'transparent';
            sel.style.appearance = 'none';
            sel.style.webkitAppearance = 'none';
          });
        `);
      } else {
        // ESTILO MODERNO (Layout atual com faixas verticais e visual dinâmico)
        await page.addStyleTag({
          content: `
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
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
            
            .no-print,
            .auto-scroll-controls, 
            [data-html2canvas-ignore="true"],
            canvas {
              display: none !important;
            }

            .chart-viewer {
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }

            .chart-viewer > div:first-of-type {
              margin-bottom: 0.5rem !important;
              padding-bottom: 0.4rem !important;
            }
            .chart-viewer img {
              height: 48px !important;
            }
            .chart-viewer h1 {
              font-size: 1.5rem !important;
            }
            .chart-viewer h2 {
              font-size: 0.95rem !important;
            }

            div[style*="marginBottom: 2.5rem"],
            div[style*="margin-bottom: 2.5rem"] {
              margin-bottom: 0.6rem !important;
            }

            ${isSingleColumn ? `
            .chart-columns {
              display: flex !important;
              flex-direction: column !important;
              gap: 1rem !important;
              width: 100% !important;
            }
            .chart-columns > div {
              display: flex !important;
              flex-direction: column !important;
              width: 100% !important;
              min-width: 100% !important;
            }
            ` : `
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
            `}

            div[id^="section-"] {
              margin-bottom: 0.8rem !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

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
      }

      // Give a tiny bit of time for DOM changes to settle and fonts to render perfectly
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfOptions: any = {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
      };

      if (!isSingleColumn) {
        pdfOptions.pageRanges = '1';
      }

      const pdfBuffer = await page.pdf(pdfOptions);

      // Puppeteer returns a Uint8Array, we convert to Buffer
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
