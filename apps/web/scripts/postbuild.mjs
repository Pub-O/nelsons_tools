import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist/index.html', import.meta.url);
const sourceScriptPath = new URL('../dist/assets/index.js', import.meta.url);
const sourceStylePath = new URL('../dist/assets/index.css', import.meta.url);

let html = await readFile(indexPath, 'utf8');
const script = (await readFile(sourceScriptPath, 'utf8')).replaceAll('</script', '<\\/script');
const style = (await readFile(sourceStylePath, 'utf8')).replaceAll('</style', '<\\/style');
const scriptMatch = html.match(/\s*<script type="module"[^>]+src="\/assets\/index\.js"[^>]*><\/script>/);
const styleMatch = html.match(/\s*<link rel="stylesheet"[^>]+href="\/assets\/index\.css"[^>]*>/);

if (scriptMatch) {
  html = html.replace(scriptMatch[0], '');
  html = html.replace('</body>', `    <script>${script}</script>\n  </body>`);
}

if (styleMatch) {
  html = html.replace(styleMatch[0], `\n    <style>${style}</style>`);
}

html = html
  .replace(/\s+crossorigin\b/g, '')
  .replace('<div id="root"></div>', '<div id="root">Pub-O laedt...</div>');

await writeFile(indexPath, html);
