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
    // Não é necessário carregar fontes externas, usaremos as fontes nativas do PDFKit
  }

  private static getFont(doc: typeof PDFDocument, type: 'regular' | 'bold') {
    if (type === 'bold') {
      doc.font('Courier-Bold');
    } else {
      doc.font('Courier');
    }
  }

  private static renderSong(doc: typeof PDFDocument, song: any) {
    // Cabeçalho - Título (Tamanho 25)
    doc.font('Helvetica-Bold');
    doc.fontSize(25).text(song.title || 'Sem Título', { align: 'center' });
    
    // Metadados
    doc.font('Helvetica');
    doc.fontSize(12).text(`Tom: ${song.original_key || song.tone || '-'} | BPM: ${song.bpm || '-'} | Compasso: ${song.time_signature || '-'}`, { align: 'center' });
    
    doc.moveDown(1.5);

    // Setup 2 colunas
    const margins = doc.page.margins;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    const gutter = 30;
    const columnWidth = (pageWidth - margins.left - margins.right - gutter) / 2;
    
    let currentColumn = 0; // 0 = esquerda, 1 = direita
    let yPos = doc.y;
    const startY = yPos;
    const bottomLimit = pageHeight - margins.bottom - 40;

    const content = song.chordpro_content || song.chord_pro || '';
    const lines = content.split('\n');

    this.getFont(doc, 'regular');
    doc.fontSize(12);

    const isSectionHeader = (line: string) => {
      const match = line.match(/^\[([^[\]]+)\]$/);
      if (!match) return false;
      const content = match[1].trim();
      if (/^[A-G]$/i.test(content)) return false; 
      const isChord = /^[A-G][#b]?(?:m|M|maj|dim|aug|sus|add)?\d*(?:\/[A-G][#b]?)?$/.test(content);
      if (isChord) return false;
      return true;
    };

    const isComment = (line: string) => {
      return line.match(/^\{(?:c:\s*|comment:\s*)?(.*?)\}$/i) !== null;
    };

    const getCommentText = (line: string) => {
      const match = line.match(/^\{(?:c:\s*|comment:\s*)?(.*?)\}$/i);
      return match ? match[1].trim() : '';
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      let xPos = margins.left + (currentColumn * (columnWidth + gutter));

      // Checagem de quebra de página/coluna
      if (yPos > bottomLimit) {
        if (currentColumn === 0) {
          currentColumn = 1;
          yPos = startY;
          xPos = margins.left + (currentColumn * (columnWidth + gutter));
        } else {
          doc.addPage();
          currentColumn = 0;
          yPos = margins.top;
          xPos = margins.left;
        }
      }

      if (line === '') {
        yPos += 16;
        continue;
      }

      const altSectionRegex = /^([\w\sçãõáéíóú]+):$/i;

      // Handle Section Headers
      if (isSectionHeader(line) || altSectionRegex.test(line)) {
        let title = line;
        if (isSectionHeader(line)) {
          title = line.match(/^\[([^[\]]+)\]$/)![1].trim();
        } else {
          title = line.match(altSectionRegex)![1].trim();
        }

        yPos += 8; // Extra spacing before section
        this.getFont(doc, 'bold');
        doc.fontSize(14).text(title, xPos, yPos, { width: columnWidth, lineBreak: true });
        yPos += doc.heightOfString(title, { width: columnWidth }) + 4;
        continue;
      }

      // Handle Comments
      if (isComment(line)) {
        this.getFont(doc, 'bold');
        doc.fontSize(12).text(`{${getCommentText(line)}}`, xPos, yPos, { width: columnWidth, lineBreak: true });
        yPos += doc.heightOfString(`{${getCommentText(line)}}`, { width: columnWidth });
        continue;
      }

      // Parse chords and lyrics
      const chordRegex = /\[(.*?)\]/g;
      let chordsLine = '';
      let lyricsLine = '';
      let lastIndex = 0;
      
      let tempLine = line;
      let currentMatch = chordRegex.exec(tempLine);
      
      while (currentMatch !== null) {
        const chordStr = currentMatch[1];
        const matchPos = currentMatch.index;
        
        const textPart = tempLine.substring(lastIndex, matchPos);
        lyricsLine += textPart;
        
        // Pad chordsLine to match lyricsLine length
        while (chordsLine.length < lyricsLine.length) {
          chordsLine += ' ';
        }
        
        chordsLine += chordStr;
        
        lastIndex = matchPos + currentMatch[0].length;
        currentMatch = chordRegex.exec(tempLine);
      }
      
      lyricsLine += tempLine.substring(lastIndex);

      this.getFont(doc, 'regular');
      doc.fontSize(12);

      // Render Chords
      if (chordsLine.trim() !== '') {
        this.getFont(doc, 'bold');
        // Replace spaces with non-breaking spaces if needed, but pdfkit handles spaces in Courier fine.
        doc.text(chordsLine, xPos, yPos, { lineBreak: false });
        yPos += 14;
      }

      // Render Lyrics
      if (lyricsLine.trim() !== '') {
        this.getFont(doc, 'regular');
        doc.text(lyricsLine, xPos, yPos, { lineBreak: false });
        yPos += 14;
      }

      if (chordsLine.trim() === '' && lyricsLine.trim() === '') {
        yPos += 14;
      }
    }
  }
}
