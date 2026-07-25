import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract one version's Markdown body from a Keep a Changelog document.
 *
 * @param {string} changelog
 * @param {string} version
 * @returns {string}
 */
export function extractReleaseNotes(changelog, version) {
  if (typeof changelog !== 'string') {
    throw new TypeError('changelog must be a string');
  }
  if (typeof version !== 'string' || !version.trim()) {
    throw new TypeError('version must be a non-empty string');
  }

  const headingPattern = new RegExp(
    `^## \\[${escapeRegExp(version.trim())}\\](?:[ \\t]+.*)?[ \\t]*$`,
    'm'
  );
  const heading = headingPattern.exec(changelog);
  if (!heading) {
    throw new Error(`CHANGELOG.md has no section for ${version}`);
  }

  const afterHeading = changelog.slice(heading.index + heading[0].length)
    .replace(/^\r?\n/, '');
  const nextSection = afterHeading.search(/^##\s+/m);
  const notes = (nextSection === -1
    ? afterHeading
    : afterHeading.slice(0, nextSection)).trim();

  if (!notes) {
    throw new Error(`CHANGELOG.md section for ${version} is empty`);
  }
  return notes;
}

/**
 * Read a package version and its release notes from a project directory.
 *
 * @param {string | undefined} requestedVersion
 * @param {string} root
 * @returns {Promise<{ version: string, notes: string }>}
 */
export async function loadReleaseNotes(requestedVersion, root = projectRoot) {
  const [packageSource, changelog] = await Promise.all([
    readFile(join(root, 'package.json'), 'utf8'),
    readFile(join(root, 'CHANGELOG.md'), 'utf8'),
  ]);
  const packageJson = JSON.parse(packageSource);
  const version = requestedVersion || packageJson.version;
  return {
    version,
    notes: extractReleaseNotes(changelog, version),
  };
}

async function main() {
  const { notes } = await loadReleaseNotes(process.argv[2]);
  process.stdout.write(`${notes}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
