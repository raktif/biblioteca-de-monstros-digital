import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const schemas = [
  {
    input: new URL('../schemas/add2e/v1/monster.schema.json', import.meta.url),
    output: new URL('../src/generated/add2e-monster.ts', import.meta.url),
  },
  {
    input: new URL('../schemas/shadowlords3e/v1/monster.schema.json', import.meta.url),
    output: new URL('../src/generated/shadowlords3e-monster.ts', import.meta.url),
  },
];

const checkOnly = process.argv.includes('--check');
let stale = false;

for (const { input, output } of schemas) {
  const schema = JSON.parse(await readFile(input, 'utf8'));
  const generated = await compile(schema, schema.title, {
    bannerComment: '/* Gerado automaticamente dos schemas JSON. Não editar manualmente. */',
    ignoreMinAndMaxItems: true,
    style: { singleQuote: true, semi: true },
  });

  if (checkOnly) {
    let current;
    try {
      current = await readFile(output, 'utf8');
    } catch {
      current = '';
    }
    if (current !== generated) {
      console.error(`Tipos desatualizados: ${output.pathname}`);
      stale = true;
    }
  } else {
    await mkdir(new URL('.', output), { recursive: true });
    await writeFile(output, generated, 'utf8');
    console.log(`Tipos gerados: ${output.pathname}`);
  }
}

if (stale) process.exitCode = 1;
