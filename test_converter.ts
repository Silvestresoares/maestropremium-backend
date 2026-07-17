import { TextToChordProConverter } from './src/shared/utils/TextToChordProConverter';

const testRawTxt = `
Intro:
G  D  Em  C

Refrão:
G                 D
Deus é tão bom pra mim
      Em               C
Ele cuida de tudo que há

(Fim)
C   G
`.trim();

const converted = TextToChordProConverter.convert(testRawTxt);

console.log("=== ORIGINAL ===");
console.log(testRawTxt);
console.log("\n=== CHORDPRO ===");
console.log(converted);
