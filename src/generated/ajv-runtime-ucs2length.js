// Equivalente ESM do auxiliar interno do Ajv. Mantido localmente para que o
// bundle do Vite/Tauri não dependa da interoperabilidade CommonJS/ESM.
export default function ucs2length(value) {
  let length = 0;
  let position = 0;
  while (position < value.length) {
    length += 1;
    const codePoint = value.charCodeAt(position++);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && position < value.length) {
      const nextCodePoint = value.charCodeAt(position);
      if ((nextCodePoint & 0xfc00) === 0xdc00) position += 1;
    }
  }
  return length;
}
