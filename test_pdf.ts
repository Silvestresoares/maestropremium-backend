import { PdfGenerator } from './src/shared/utils/PdfGenerator';
import fs from 'fs';

const songMock = {
  title: 'Deus é Muito Bom',
  original_key: 'G',
  bpm: 120,
  time_signature: '4/4',
  chordpro_content: `
[G]Deus é tão bom
Alelu[D]ia, Ele é [Em]rei
Nós can[C]tamos ao Se[G]nhor

[Refrão]
[G]Porque Ele [D]vive, posso [Em]crer no a[C]manhã
[G]Porque Ele [D]vive, temor não [C]há [G]
Mas eu [C]bem sei, eu [G]sei, que a minha vi[Em]da
Está nas [Am]mãos do meu [D]Jesus, que vi[G]vo está

[Ponte]
E [Em]quando a morte 
Enfim che[C]gar
Ainda as[G]sim, vou triun[D]far
`.trim()
};

const writeStream = fs.createWriteStream('./teste_cifra.pdf');
PdfGenerator.generateSongPdf(songMock, writeStream);

writeStream.on('finish', () => {
  console.log('PDF gerado com sucesso em teste_cifra.pdf');
});
