import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';

const groups = [
  {
    output: new URL('../src/generated/ajv-domain-validators.js', import.meta.url),
    declaration: new URL('../src/generated/ajv-domain-validators.d.ts', import.meta.url),
    schemas: [
      ['validateAdd2eSchema', '../schemas/add2e/v1/monster.schema.json'],
      ['validateShadowlordsSchema', '../schemas/shadowlords3e/v1/monster.schema.json'],
    ],
  },
  {
    output: new URL('../src/generated/ajv-portable-validators.js', import.meta.url),
    declaration: new URL('../src/generated/ajv-portable-validators.d.ts', import.meta.url),
    common: '../schemas/portable/v1/common.schema.json',
    schemas: [
      ['validateAdd2ePortable', '../schemas/portable/v1/add2e-monster.schema.json'],
      ['validateShadowlordsPortable', '../schemas/portable/v1/shadowlords3e-monster.schema.json'],
      ['validateLibraryPortable', '../schemas/portable/v1/library.schema.json'],
      ['validateManifestPortable', '../schemas/portable/v1/manifest.schema.json'],
    ],
  },
];

const checkOnly = process.argv.includes('--check');
let stale = false;

for (const group of groups) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    formats: { 'date-time': true },
    code: { source: true, esm: true },
  });
  if (group.common) {
    ajv.addSchema(JSON.parse(await readFile(new URL(group.common, import.meta.url), 'utf8')));
  }

  const schemaIds = {};
  for (const [exportName, schemaPath] of group.schemas) {
    const schema = JSON.parse(await readFile(new URL(schemaPath, import.meta.url), 'utf8'));
    ajv.compile(schema);
    schemaIds[exportName] = schema.$id;
  }

  const generated = standaloneCode(ajv, schemaIds)
    .replace(
      /const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g,
      'import $1 from "./ajv-runtime-ucs2length.js";',
    )
    .replace(
      /const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/g,
      'import $1 from "./ajv-runtime-equal.js";',
    );
  const declarations = [
    "import type { ValidateFunction } from 'ajv';",
    ...group.schemas.map(([exportName]) => `export declare const ${exportName}: ValidateFunction;`),
    '',
  ].join('\n');

  for (const [path, content] of [[group.output, generated], [group.declaration, declarations]]) {
    if (checkOnly) {
      let current;
      try { current = await readFile(path, 'utf8'); } catch { current = ''; }
      if (current !== content) {
        console.error(`Validadores gerados desatualizados: ${path.pathname}`);
        stale = true;
      }
    } else {
      await mkdir(new URL('.', path), { recursive: true });
      await writeFile(path, content, 'utf8');
      console.log(`Validadores gerados: ${path.pathname}`);
    }
  }
}

if (stale) process.exitCode = 1;
