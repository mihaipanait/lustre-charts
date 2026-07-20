/**
 * Keep the VERSION export in src/index.js in sync with package.json.
 *
 * Runs from the npm `version` lifecycle hook (see package.json), which
 * fires after `npm version` bumps package.json but before it creates
 * the release commit — so the synced file rides along in that commit.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const file = 'src/index.js';
const source = readFileSync(file, 'utf8');
const pattern = /export const VERSION = '[^']*';/;

if (!pattern.test(source)) {
  console.error(`${file}: VERSION export not found — update the pattern in tools/sync-version.mjs`);
  process.exit(1);
}

writeFileSync(file, source.replace(pattern, `export const VERSION = '${version}';`));
console.log(`${file}: VERSION -> ${version}`);
