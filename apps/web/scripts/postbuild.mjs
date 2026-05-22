import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist/index.html', import.meta.url);
const buildId = Date.now().toString(36);

let html = await readFile(indexPath, 'utf8');
const scriptMatch = html.match(/\s*<script type="module"[^>]+src="\/assets\/index\.js"[^>]*><\/script>/);

if (scriptMatch) {
  const scriptTag = scriptMatch[0]
    .trim()
    .replace(/\s+crossorigin\b/g, '')
    .replace('/assets/index.js', `/assets/index.js?v=${buildId}`);

  html = html.replace(scriptMatch[0], '');
  html = html.replace('</body>', `    ${scriptTag}\n  </body>`);
}

html = html
  .replace(/\s+crossorigin\b/g, '')
  .replace('/assets/index.css', `/assets/index.css?v=${buildId}`)
  .replace('<div id="root"></div>', '<div id="root">Pub-O laedt...</div>');

await writeFile(indexPath, html);
