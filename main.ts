// Sunset Cover Studio — the gta6-cover-art-01 entry's hand-in program.
// Node 22, standard library only. It copies this repository's app/ and
// screenshots/ into the output directory and writes dossier.json there with
// the kit's vendored buildDossier, exactly as the gate recomputes it.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The grader runs this program twice in a fresh container with no network:
// both runs must write identical bytes. Nothing here reads the network, the
// clock, or any path outside this repository and the output directory.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory holding this file; the output goes to
// /output in the grader, or to MAKEFUN_OUTPUT_DIR when set for local runs.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the whole static app first, then the screenshots beside it.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: the same caps the gate scores against, so a
// local run fails here exactly where the scorer would refuse the entry.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
