import { copyFile, readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist/index.html', import.meta.url);
const sourceScriptPath = new URL('../dist/assets/index.js', import.meta.url);
const sourceStylePath = new URL('../dist/assets/index.css', import.meta.url);
const publicScriptPath = new URL('../dist/pubo-app.js', import.meta.url);
const publicStylePath = new URL('../dist/pubo-app.css', import.meta.url);
const buildId = Date.now().toString(36);

let html = await readFile(indexPath, 'utf8');
const scriptMatch = html.match(/\s*<script type="module"[^>]+src="\/assets\/index\.js"[^>]*><\/script>/);

if (scriptMatch) {
  html = html.replace(scriptMatch[0], '');
  html = html.replace('</body>', `    <script defer src="/pubo-app.js?v=${buildId}"></script>\n  </body>`);
}

html = html
  .replace(/\s+crossorigin\b/g, '')
  .replace('/assets/index.css', `/pubo-app.css?v=${buildId}`)
  .replace('<div id="root"></div>', '<div id="root">Pub-O laedt...</div>');

await copyFile(sourceScriptPath, publicScriptPath);
await copyFile(sourceStylePath, publicStylePath);
await writeFile(indexPath, html);
