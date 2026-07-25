import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  extractReleaseNotes,
  loadReleaseNotes,
} from '../tools/release-notes.mjs';

test('extracts exactly one changelog version', () => {
  const changelog = [
    '# Changelog',
    '',
    '## [0.2.0] — 2026-08-01',
    '',
    '### Added',
    '',
    '- A new feature.',
    '',
    '## [0.1.0] — 2026-07-01',
    '',
    '### Added',
    '',
    '- The first feature.',
  ].join('\r\n');

  assert.equal(
    extractReleaseNotes(changelog, '0.2.0'),
    '### Added\r\n\r\n- A new feature.'
  );
});

test('rejects missing and empty release sections', () => {
  assert.throws(
    () => extractReleaseNotes('## [0.1.0]\n\n- Existing.', '0.2.0'),
    /no section for 0\.2\.0/
  );
  assert.throws(
    () => extractReleaseNotes('## [0.2.0]\n\n## [0.1.0]\n\n- Existing.', '0.2.0'),
    /section for 0\.2\.0 is empty/
  );
});

test('loads the current package release notes', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );
  const release = await loadReleaseNotes(undefined, root);

  assert.equal(release.version, packageJson.version);
  assert.match(release.notes, /TypeScript declarations/);
  assert.doesNotMatch(release.notes, /^## \[/m);
});
