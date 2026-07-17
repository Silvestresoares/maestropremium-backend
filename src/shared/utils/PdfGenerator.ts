import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class PdfGenerator {
  static generateSongPdf(song: any, stream: any) {
    // A4 size is 595.28 x 841.89 points
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(stream);

    this.setupFonts(doc);
    this.renderSong(doc, song);
    doc.end();
  }

  static generateSetlistPdf(event: any, songs: any[], stream: any) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(stream);

    this.setupFonts(doc);

    if (songs.length === 0) {
      this.getFont(doc, 'regular');
      doc.fontSize(20).text('Nenhuma música neste repertório.', { align: 'center' });
    } else {
      songs.forEach((song, index) => {
        if (index > 0) doc.addPage();
        this.renderSong(doc, song);
      });
    }

    doc.end();
  }

  private static setupFonts(doc: typeof PDFDocument) {
    // Caminho da fonte baixada dentro do projeto
    const localFontPath = path.join(__dirname, '../fonts/Aparajita.ttf');

    // Fallbacks para caso o sistema tenha outras versões instaladas localmente
    const fontPaths = [
      localFontPath,
      'C:/Windows/Fonts/aparaj.ttf', 
      'C:/Windows/Fonts/aprajita.ttf'
    ];
    const boldFontPaths = [
      'C:/Windows/Fonts/aparajb.ttf', 
      'C:/Windows/Fonts/aprajitab.ttf'
    ];

    let fontRegistered = false;
    for (const p of fontPaths) {
      if (fs.existsSync(p)) {
        doc.registerFont('Aprajita', p);
        fontRegistered = true;
        break;
      }
    }

    let boldRegistered = false;
    for (const p of boldFontPaths) {
      if (fs.existsSync(p)) {
        doc.registerFont('Aprajita-Bold', p);
        boldRegistered = true;
        break;
      }
    }

    // Se achou a normal mas não a bold, repete a normal
    if (fontRegistered && !boldRegistered) {
      doc.registerFont('Aprajita-Bold', 'Aprajita');
    }
  }

  private static getFont(doc: typeof PDFDocument, type: 'regular' | 'bold') {
    try {
      if (type === 'bold') {
        doc.font('Aprajita-Bold');
      } else {
        doc.font('Aprajita');
      }
    } catch {
      doc.font(type === 'bold' ? 'Times-Bold' : 'Times-Roman');
    }
  }

  private static renderSong(doc: typeof PDFDocument, song: any) {
    // Cabeçalho - Título (Tamanho 25)
    this.getFont(doc, 'bold');
    doc.fontSize(25).text(song.title || 'Sem Título', { align: 'center' });
    
    // Metadados
    this.getFont(doc, 'regular');
    doc.fontSize(14).text(`Tom: ${song.original_key || '-'} | BPM: ${song.bpm || '-'} | Compasso: ${song.time_signature || '-'}`, { align: 'center' });
    
    doc.moveDown(1.5);

    // Setup 2 colunas
    const margins = doc.page.margins;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Calcula largura da coluna deixando 30pt de espaçamento no meio (gutter)
    const gutter = 30;
    const columnWidth = (pageWidth - margins.left - margins.right - gutter) / 2;
    
    let currentColumn = 0; // 0 = esquerda, 1 = direita
    let yPos = doc.y;
    const startY = yPos; // Ponto inicial (abaixo do cabeçalho)
    const bottomLimit = pageHeight - margins.bottom - 40; // Limite antes de pular

    const content = song.chordpro_content || '';
    const lines = content.split('\n');

    this.getFont(doc, 'regular');
    doc.fontSize(20);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let xPos = margins.left + (currentColumn * (columnWidth + gutter));

      // Checagem de quebra de página/coluna
      if (yPos > bottomLimit) {
        if (currentColumn === 0) {
          // Pula para segunda coluna
          currentColumn = 1;
          yPos = startY;
          xPos = margins.left + (currentColumn * (columnWidth + gutter));
        } else {
          // Pula página e zera coluna, MAS precisamos redesenhar o cabeçalho?
          // Geralmente a cifra continua sem cabeçalho, apenas do topo
          doc.addPage();
          currentColumn = 0;
          yPos = margins.top;
          xPos = margins.left;
        }
      }

      if (line.trim() === '') {
        yPos += 24; // Pula linha
        continue;
      }

      const segments = this.parseChordProLine(line);
      
      // Renderiza a linha de ACORDES
      let currentX = xPos;
      this.getFont(doc, 'bold');
      
      segments.forEach((seg: any) => {
        if (seg.chord) {
          doc.text(seg.chord, currentX, yPos, { lineBreak: false });
        }
        
        // Calcula a largura que este segmento vai ocupar (o que for maior: acorde ou pedaço da letra)
        const chordWidth = seg.chord ? doc.widthOfString(seg.chord + ' ') : 0;
        
        this.getFont(doc, 'regular');
        const textWidth = doc.widthOfString(seg.text);
        seg.advance = Math.max(chordWidth, textWidth);
        
        currentX += seg.advance;
        this.getFont(doc, 'bold'); // Volta pra bold para o próximo acorde
      });

      yPos += 18; // Desce para desenhar a letra

      // Renderiza a linha de LETRA
      currentX = xPos;
      this.getFont(doc, 'regular');
      segments.forEach((seg: any) => {
        if (seg.text) {
          doc.text(seg.text, currentX, yPos, { lineBreak: false });
        }
        currentX += seg.advance;
      });

      yPos += 24; // Desce para a próxima linha (letra + acorde)
    }
  }

  private static parseChordProLine(line: string) {
    const segments = [];
    const regex = /\[(.*?)\]([^\[]*)/g;
    
    const firstChordIndex = line.indexOf('[');
    if (firstChordIndex > 0 || firstChordIndex === -1) {
      segments.push({
        chord: '',
        text: firstChordIndex === -1 ? line : line.substring(0, firstChordIndex)
      });
    }

    if (firstChordIndex !== -1) {
      let match;
      while ((match = regex.exec(line)) !== null) {
        segments.push({
          chord: match[1],
          text: match[2]
        });
      }
    }
    return segments;
  }
}
