#!/usr/bin/env node
/**
 * Build the single-file version of the game.
 *
 * The game itself needs no build step — `serve.py` runs the source as-is, and
 * that is still the way to develop it. This script exists only to produce one
 * self-contained .html for places that can host a page but not a folder of ES
 * modules: a chat attachment, a pastebin, an Artifact.
 *
 *     node build-artifact.mjs [out.html]        # default: dist/milbil-tower.html
 *
 * esbuild is fetched on demand by npx, so there is nothing to install and no
 * package.json in the project.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? `${here}/dist/milbil-tower.html`);

// --- 1. bundle the modules into one script ---
const bundle = execFileSync(
  'npx',
  ['--yes', 'esbuild', `${here}/js/main.js`, '--bundle', '--format=esm', '--target=es2022'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
);

// --- 2. the stylesheet, inlined ---
const css = readFileSync(`${here}/css/style.css`, 'utf8');

// --- 3. the markup between <body> and </body>, minus the module tag we just inlined ---
const html = readFileSync(`${here}/index.html`, 'utf8');
const body = html
  .slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .trim();

// A host that wraps the file supplies <html>, <head> and <body> itself, so this
// emits only what goes inside them.
const page = `<title>Milbil Tower</title>
<style>
${css}</style>

${body}

<script type="module">
${bundle}</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out}  (${(page.length / 1024).toFixed(0)} KB)`);
