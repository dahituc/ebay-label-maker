import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEbayCsv } from '../src/services/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const csvContent = fs.readFileSync(path.join(__dirname, 'sample.csv'), 'utf8');
  const results = await parseEbayCsv(csvContent);
  console.log(JSON.stringify(results, null, 2));
}

runTest();
