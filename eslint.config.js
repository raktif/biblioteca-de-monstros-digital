import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
export default [
  { ignores: ['dist', 'src-tauri/target', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
];
