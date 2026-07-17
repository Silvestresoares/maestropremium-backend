export class TextToChordProConverter {
  /**
   * Converte um texto de cifra comum (acordes em cima, letras embaixo)
   * para o formato ChordPro ([Acorde]Letra).
   */
  static convert(rawText: string): string {
    const lines = rawText.split(/\r?\n/);
    const output: string[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        output.push('');
        i++;
        continue;
      }

      if (this.isChordLine(line)) {
        // Encontrou linha de acordes.
        // Vamos checar a próxima linha.
        const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

        if (nextLine !== null && nextLine.trim().length > 0 && !this.isChordLine(nextLine)) {
          // A próxima linha é a letra. Vamos mesclar.
          const merged = this.mergeChordsAndLyrics(line, nextLine);
          output.push(merged);
          i += 2; // Pula a linha de letra que já foi mesclada
        } else {
          // Se não há letra embaixo (ex: Intro, ou solo), converte em acordes puros [G] [C]
          const standaloneChords = this.mergeChordsAndLyrics(line, "");
          output.push(standaloneChords);
          i++;
        }
      } else {
        // Linha comum (letra sem acorde, seção como [Refrão], etc)
        output.push(line);
        i++;
      }
    }

    return output.join('\n');
  }

  /**
   * Verifica se uma linha é predominantemente composta de acordes.
   */
  private static isChordLine(line: string): boolean {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length === 0) return false;

    let chordCount = 0;
    // Regex flexível para capturar acordes (inclui extensões e baixos invertidos)
    const chordRegex = /^([A-G][#b]?)(m|M|maj|min|dim|aug|sus|add)?[0-9]*(\/[A-G][#b]?)?$/;

    for (const token of tokens) {
      // Limpa parênteses ao redor de acordes, ex: (G)
      const cleanToken = token.replace(/[\(\)\[\]]/g, '');
      if (chordRegex.test(cleanToken)) {
        chordCount++;
      }
    }

    // Se mais de 60% das palavras na linha parecem acordes, e a linha é curta ou muito vazada, consideramos linha de acorde.
    return (chordCount / tokens.length) >= 0.6;
  }

  /**
   * Mescla a linha de acordes com a linha de letras usando os índices de coluna originais.
   */
  private static mergeChordsAndLyrics(chordLine: string, lyricLine: string): string {
    // Encontrar todos os acordes e suas posições (índices) na chordLine
    const chords: { chord: string, index: number }[] = [];
    const regex = /\S+/g;
    let match;

    while ((match = regex.exec(chordLine)) !== null) {
      chords.push({
        chord: match[0],
        index: match.index
      });
    }

    // Ordenar do último para o primeiro para não atrapalhar os índices ao inserir
    chords.sort((a, b) => b.index - a.index);

    let result = lyricLine;

    // Preenche com espaços vazios caso a linha de acordes seja mais comprida que a de letras
    const maxChordIndex = chords.length > 0 ? chords[0].index : 0;
    if (result.length < maxChordIndex) {
      result = result.padEnd(maxChordIndex, ' ');
    }

    for (const c of chords) {
      const idx = c.index;
      // Insere o acorde no formato [Acorde] na posição correspondente
      result = result.slice(0, idx) + `[${c.chord}]` + result.slice(idx);
    }

    // Se a letra for muito vazia, o resultado pode ficar cheio de espaços no meio. Podemos limpar duplos espaços entre colchetes se quiser, mas ChordPro aceita normal.
    return result.trimEnd(); // Remove espaços extras apenas no final
  }
}
