// main.ts — hands this repository's frontend in as an entry (Node 22, stdlib
// only). It checks the three screenshots, clears the target directory, copies
// app/ and screenshots/ into it, and writes dossier.json with the vendored
// make.fun library. The scorer rebuilds the dossier from the same files with
// its own identical copy, so the two must match byte for byte.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shotsDir = join(repoRoot, 'screenshots');
const MAX_SHOT_BYTES = 262144;
const MAX_DOSSIER_BYTES = 1572864;

function checkShots() {
  const names = readdirSync(shotsDir)
    .filter((n) => !n.startsWith('.'))
    .sort();
  if (names.length !== 3) {
    throw new Error(`screenshots/ must hold exactly 3 shots, found ${names.length}`);
  }
  for (const name of names) {
    const full = join(shotsDir, name);
    const info = statSync(full);
    if (!info.isFile()) throw new Error(`screenshot ${name} is not a file`);
    if (!/\.(png|jpe?g)$/i.test(name)) {
      throw new Error(`screenshot ${name} is not a PNG or JPEG`);
    }
    if (info.size > MAX_SHOT_BYTES) {
      throw new Error(`screenshot ${name} is ${info.size} bytes, over the 256 KiB cap`);
    }
  }
  return names;
}

function checkApp() {
  const index = join(repoRoot, 'app', 'index.html');
  const info = statSync(index);
  if (!info.isFile()) throw new Error('app/index.html is missing');
  if (info.size > 1048576) {
    throw new Error(`app/index.html is ${info.size} bytes, over the 1 MiB cap`);
  }
  return info.size;
}

function handIn() {
  const shotNames = checkShots();
  const indexBytes = checkApp();

  mkdirSync(targetDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(targetDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(targetDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(targetDir, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: MAX_SHOT_BYTES },
    app_max_files: 993,
    app_max_bytes: 16777216,
  });
  if (Buffer.byteLength(dossier, 'utf8') > MAX_DOSSIER_BYTES) {
    throw new Error('dossier.json is over the 1.5 MiB cap');
  }
  writeFileSync(join(targetDir, 'dossier.json'), dossier);

  const appNames = readdirSync(join(targetDir, 'app'));
  console.log(
    `handed in: ${appNames.length} app files (index.html ${indexBytes} B), ` +
      `shots ${shotNames.join(', ')}, ` +
      `dossier ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${targetDir}`,
  );
}

handIn();
