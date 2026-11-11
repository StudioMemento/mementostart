// Injects the server-rendered page into dist/index.html so content exists before JavaScript runs.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { render } = await import(pathToFileURL(resolve(root, '.ssr/entry-server.js')).href);
const file = resolve(root, 'dist/index.html');
const html = readFileSync(file, 'utf8');
if (!html.includes('<!--app-html-->')) throw new Error('Prerender marker missing in dist/index.html');
writeFileSync(file, html.replace('<!--app-html-->', render()));
rmSync(resolve(root, '.ssr'), { recursive: true, force: true });
console.log('Prerendered dist/index.html');
