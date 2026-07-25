import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const threeVersion = process.env.LUSTRE_THREE_VERSION || '0.185.1';
const scratch = await mkdtemp(join(tmpdir(), 'lustre-consumer-'));

function run(command, args, cwd) {
  let executable = command;
  let executableArgs = args;
  if (command === 'npm' && process.env.npm_execpath) {
    executable = process.execPath;
    executableArgs = [process.env.npm_execpath, ...args];
  }
  const result = spawnSync(executable, executableArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

try {
  run('npm', [
    'pack',
    '--pack-destination',
    scratch,
  ], root);
  const packedFiles = (await readdir(scratch))
    .filter((filename) => filename.endsWith('.tgz'));
  if (packedFiles.length !== 1) {
    throw new Error(
      `expected npm pack to create one tarball, found ${packedFiles.length}`
    );
  }
  const tarball = resolve(scratch, packedFiles[0]);

  await writeFile(join(scratch, 'package.json'), JSON.stringify({
    name: 'lustre-consumer-smoke',
    private: true,
    type: 'module',
  }, null, 2));

  run('npm', [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    tarball,
    `three@${threeVersion}`,
    `@types/three@${threeVersion}`,
  ], scratch);

  await writeFile(join(scratch, 'smoke.mjs'), `
    import {
      VERSION,
      LustreChart,
      buildProfile,
      buildSliceGeometry,
    } from 'lustre-charts';

    if (VERSION !== ${JSON.stringify(packageJson.version)}) {
      throw new Error(\`expected VERSION ${packageJson.version}, received \${VERSION}\`);
    }
    if (typeof LustreChart !== 'function') {
      throw new Error('LustreChart export is missing');
    }
    const profile = buildProfile('rounded', {
      innerRadius: 1,
      radius: 3,
      height: 1,
      cornerRadius: 0.15,
    });
    const geometry = buildSliceGeometry(profile, 0, Math.PI / 2);
    if (!geometry.getAttribute('position')?.count) {
      throw new Error('published geometry export produced no vertices');
    }
    geometry.dispose();
  `);

  run(process.execPath, ['smoke.mjs'], scratch);

  await writeFile(join(scratch, 'smoke.ts'), `
    import {
      LustreChart,
      type LustreOptions,
      type PieData,
    } from 'lustre-charts';

    declare const container: HTMLElement;
    const data: PieData = [{ label: 'Typed', value: 1 }];
    const options: LustreOptions = {
      theme: { extends: 'light', tooltip: { text: '#111111' } },
      material: { preset: 'glass', roughness: 0.1 },
    };
    const chart = new LustreChart(container, { type: 'pie', data, options });
    chart.applyOptions({ camera: { fov: 42 } });
    chart.destroy();
  `);
  await writeFile(join(scratch, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      skipLibCheck: true,
    },
    include: ['smoke.ts'],
  }, null, 2));
  run(process.execPath, [
    join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--project',
    'tsconfig.json',
  ], scratch);

  console.log(
    `consumer JS/types smoke passed: lustre-charts@${packageJson.version} with three@${threeVersion}`
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
