// Entry program for turkey-run-game-01.
//
// The playable game is the plain static tree in game/ (no build step, no network
// requests). This program hands the entry in: it copies game/ and screenshots/
// next to /output (or $MAKEFUN_OUTPUT_DIR off the grader) and writes
// /output/dossier.json from the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function mustDir(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${label} is missing or not a directory: ${path}`);
  }
}

mustDir(join(root, 'game'), 'game/');
mustDir(join(root, 'screenshots'), 'screenshots/');

mkdirSync(dest, { recursive: true });
// Drop the trees this program owns so a rerun never inherits stale files from an
// earlier run (the output directory itself and anything else in it stay untouched).
for (const name of ['game', 'screenshots']) rmSync(join(dest, name), { recursive: true, force: true });
cpSync(join(root, 'game'), join(dest, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(dest, 'screenshots'), { recursive: true });

// buildDossier reads the copied tree, so it must run after the copy and write
// straight to its final path — nothing else is left in the output directory.
const dossier = buildDossier(dest, CAPS);
writeFileSync(join(dest, 'dossier.json'), dossier);

console.log(`turkey-run-game-01: wrote ${dossier.length} dossier bytes to ${join(dest, 'dossier.json')}`);
