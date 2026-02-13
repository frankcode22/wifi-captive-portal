import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const swPath = path.join(distDir, 'sw.js');

console.log('📦 Generating Service Worker asset list...');

// Read index.html
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

// Extract all asset references
const assetMatches = indexHtml.matchAll(/["'](\/assets\/[^"']+)["']/g);
const assets = ['/', '/index.html'];

for (const match of assetMatches) {
  assets.push(match[1]);
}

console.log('✅ Found assets:', assets);

// Read and update sw.js
let swContent = fs.readFileSync(swPath, 'utf-8');

// Replace STATIC_ASSETS array
swContent = swContent.replace(
  /const STATIC_ASSETS = \[[\s\S]*?\];/,
  `const STATIC_ASSETS = ${JSON.stringify(assets, null, 2)};`
);

// Write back
fs.writeFileSync(swPath, swContent);

console.log('✅ Service Worker updated successfully!');