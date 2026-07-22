import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export class PuppeteerGenerator {
  static async generatePdf(url: string): Promise<Buffer> {
    console.log(`Starting Puppeteer for URL: ${url}`);
    
    // Ensure Sparticuz Chromium sets up correctly
    chromium.setGraphicsMode = false;

    // Launch a headless browser optimized for cloud/serverless environments (like Render)
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      headless: true,
      args: [...chromium.args, '--font-render-hinting=none'],
    });

    try {
      const page = await browser.newPage();
      
      // Navigate to the provided URL (which should be the print template)
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for the specific element that indicates loading is finished.
      // PrintTemplate.tsx removes the #print-loading div when finished loading.
      await page.waitForSelector('#pdf-chart-container', { timeout: 10000 });
      
      // We inject CSS directly via Puppeteer to handle the specific layout requirements
      // similar to what we did in the iframe approach, but now in the backend.
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
          
          /* Hide unwanted UI controls */
          .auto-scroll-controls, 
          [data-html2canvas-ignore="true"] {
            display: none !important;
          }

          /* Increase only chords and lyrics size */
          .chord-line {
            font-size: 1.4rem !important;
          }
          .lyric-line {
            font-size: 1.45rem !important;
            min-height: 1.65rem !important;
          }
          .song-line {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .chart-columns {
            display: block !important;
            column-count: 2 !important;
            column-gap: 2rem !important;
            column-fill: auto !important;
            width: 100% !important;
          }
          .chart-columns > div {
            display: contents !important;
          }
          div[id^="section-"] {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          h3, h2, .print-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
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
      });

      // Puppeteer returns a Uint8Array, we convert to Buffer
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
