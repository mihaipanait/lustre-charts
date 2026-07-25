import { isAbsolute, relative, resolve } from 'node:path';

export const MAX_SHOT_BODY_BYTES = 12 * 1024 * 1024;

/**
 * Resolve a screenshot destination inside `toolsDir`.
 * Only short, portable filenames are accepted; path separators and traversal
 * segments are deliberately excluded.
 */
export function screenshotPath(toolsDir, requestedName, extension) {
  const name = requestedName || 'shot';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(name) || name === '.' || name === '..') {
    throw new Error('invalid screenshot name');
  }
  if (extension !== 'png' && extension !== 'jpg') {
    throw new Error('invalid screenshot extension');
  }

  const base = resolve(toolsDir);
  const destination = resolve(base, `${name}.${extension}`);
  const rel = relative(base, destination);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('screenshot path escapes tools directory');
  }
  return destination;
}
