
import fs from 'fs';
const content = fs.readFileSync('src/components/notebooks/NotebookCanvas.tsx', 'utf8');

let curly = 0;
let round = 0;
let square = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') curly++;
  if (char === '}') curly--;
  if (char === '(') round++;
  if (char === ')') round--;
  if (char === '[') square++;
  if (char === ']') square--;
}

console.log(`Curly: ${curly}, Round: ${round}, Square: ${square}`);
