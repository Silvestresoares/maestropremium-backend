export class ChordTransposer {
  // Escalas de referência para busca de índice (0 a 11)
  private static sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  private static flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Tons que preferem bemóis (Majors e Minors)
  private static flatKeys = [
    'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
    'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'
  ];

  static transpose(chordProText: string, originalKey: string, targetKey: string): string {
    if (originalKey === targetKey) return chordProText;

    // Determina qual escala usar baseada no tom de destino
    const targetScale = this.flatKeys.includes(targetKey) ? this.flatNames : this.sharpNames;
    
    // Calcula o deslocamento (delta)
    // Precisamos extrair apenas a raiz (C, C#, etc) ignorando se é menor (m, m7)
    const origRoot = this.extractRoot(originalKey);
    const targetRoot = this.extractRoot(targetKey);

    const origIndex = this.findIndex(origRoot);
    const targetIndex = this.findIndex(targetRoot);

    if (origIndex === -1 || targetIndex === -1) return chordProText;
    const delta = targetIndex - origIndex;

    const isSectionHeader = (line: string) => {
      const match = line.match(/^\[([^\[\]]+)\]$/);
      if (!match) return false;
      const content = match[1].trim();
      if (/^[A-G]$/i.test(content)) return false; 
      const isChord = /^[A-G][#b]?(?:m|M|maj|dim|aug|sus|add)?\d*(?:\/[A-G][#b]?)?$/.test(content);
      if (isChord) return false;
      return true;
    };

    const lines = chordProText.split('\n');
    const transposedLines = lines.map(line => {
      // Se for um cabeçalho de seção verdadeiro (ex: [Refrão], [V1]), não transpor!
      if (isSectionHeader(line.trim())) {
        return line;
      }

      return line.replace(/\[(.*?)\]/g, (match, chordInsideBrackets) => {
        const transposedChord = this.processChord(chordInsideBrackets, delta, targetScale);
        return `[${transposedChord}]`;
      });
    });

    return transposedLines.join('\n');
  }

  private static processChord(chord: string, delta: number, targetScale: string[]): string {
    const parts = chord.split('/');
    const transposedParts = parts.map(part => this.transposeSingleNote(part, delta, targetScale));
    return transposedParts.join('/');
  }

  private static transposeSingleNote(noteWithModifier: string, delta: number, targetScale: string[]): string {
    const match = noteWithModifier.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return noteWithModifier;

    const root = match[1];
    const modifier = match[2] || '';

    const rootIndex = this.findIndex(root);
    if (rootIndex === -1) return noteWithModifier;

    // Calcula o novo índice
    let newIndex = (rootIndex + delta) % 12;
    if (newIndex < 0) newIndex += 12;

    return targetScale[newIndex] + modifier;
  }

  // Busca o índice universal (0-11) ignorando se é sustenido ou bemol
  private static findIndex(note: string): number {
    const sharpIndex = this.sharpNames.indexOf(note);
    if (sharpIndex !== -1) return sharpIndex;
    
    return this.flatNames.indexOf(note);
  }

  // Extrai apenas a nota raiz (A-G e acidentes) ignorando extensões (m, 7, etc)
  private static extractRoot(key: string): string {
    const match = key.match(/^([A-G][#b]?)/);
    return match ? match[1] : key;
  }
}