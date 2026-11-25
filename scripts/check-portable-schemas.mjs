import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = resolve(root, 'schemas/portable/v1');
const names = ['common', 'manifest', 'library', 'add2e-monster', 'shadowlords3e-monster'];
const readSchema = async (name) => JSON.parse(await readFile(resolve(base, `${name}.schema.json`), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, formats: { 'date-time': true } });
ajv.addSchema(await readSchema('common'));
for (const name of names.slice(1)) {
  ajv.compile(await readSchema(name));
  console.log(`Schema portátil válido: ${name}`);
}
