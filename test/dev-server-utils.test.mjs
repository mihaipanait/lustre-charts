import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';

import { MAX_SHOT_BODY_BYTES, screenshotPath } from '../tools/dev-server-utils.mjs';

test('resolves screenshot names inside the tools directory', () => {
  const tools = resolve('tools');
  assert.equal(screenshotPath(tools, 'pie-dark_01', 'png'), join(tools, 'pie-dark_01.png'));
  assert.equal(screenshotPath(tools, '', 'jpg'), join(tools, 'shot.jpg'));
});

test('rejects traversal and non-portable screenshot names', () => {
  const tools = resolve('tools');
  for (const name of ['../outside', '..\\outside', '/absolute', '.', '..', 'has spaces']) {
    assert.throws(() => screenshotPath(tools, name, 'png'), /invalid screenshot name/);
  }
  assert.throws(() => screenshotPath(tools, 'shot', 'webp'), /invalid screenshot extension/);
  assert.equal(MAX_SHOT_BODY_BYTES, 12 * 1024 * 1024);
});
