import { ChordTransposer } from './src/shared/utils/ChordTransposer';

console.log('--- TESTE DE TRANSPOSIÇÃO ---');
console.log('1. G para A:', ChordTransposer.transpose('[G]Deus [D]bom', 'G', 'A'));
console.log('2. F para Gb:', ChordTransposer.transpose('[F]Deus [C]bom', 'F', 'Gb'));
console.log('3. Am para Bm:', ChordTransposer.transpose('[Am]Deus [E]bom', 'Am', 'Bm')); // BUG! originalKey/targetKey with 'm'
console.log('4. C#m para Dm:', ChordTransposer.transpose('[C#m]Deus [G#]bom', 'C#m', 'Dm')); // BUG!
