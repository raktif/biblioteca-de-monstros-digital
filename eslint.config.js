import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist', 'src-tauri/target', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
];
