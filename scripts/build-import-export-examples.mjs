import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';

const root = path.resolve('docs/examples/import-export');
const systems = ['add2e', 'shadowlords3e'];
const archives = [];

for (const system of systems) {
  for (const packageKind of ['library', 'monster']) {
    const suffix = packageKind === 'library' ? 'library' : 'monster';
    const sourceDir = path.join(root, system);
    const manifestText = await readFile(path.join(sourceDir, `manifest.${suffix}.json`), 'utf8');
    const manifest = JSON.parse(manifestText.replace(/^\uFEFF/, ''));
    const files = {};

    for (const entry of manifest.files) {
      const sourceName = entry.path === 'library.json' ? 'library.json' : 'monster.json';
      files[entry.path] = await readFile(path.join(sourceDir, sourceName));
      entry.size = files[entry.path].length;
      entry.sha256 = createHash('sha256').update(files[entry.path]).digest('hex');
    }
    manifest.totalUncompressedBytes = manifest.files.reduce((sum, entry) => sum + entry.size, 0);
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(path.join(sourceDir, `manifest.${suffix}.json`), manifestBytes);
    files['manifest.json'] = manifestBytes;

    const archiveName = `${system}-${suffix}-reference.zip`;
    const bytes = zipSync(files, { level: 6 });
    await writeFile(path.join(root, archiveName), bytes);
    archives.push(`${createHash('sha256').update(bytes).digest('hex')}  ${archiveName}`);
  }
}

await writeFile(path.join(root, 'SHA256SUMS.txt'), `${archives.join('\n')}\n`);
