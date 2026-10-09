import js from '@eslint/js';
import globals from 'globals';
export default [
 {ignores:['node_modules/**','dist/**','public/**','release/**','tmp/**','scripts/verify.cjs']},
 js.configs.recommended,
 {files:['**/*.js','**/*.mjs','**/*.cjs'],languageOptions:{ecmaVersion:'latest',globals:{...globals.node}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_'}]}},
 {files:['app.js','menu-data.js','client/**/*.js'],languageOptions:{sourceType:'script',globals:{...globals.browser}}},
 {files:['tests/e2e/**/*.mjs'],languageOptions:{globals:{...globals.browser}}}
];
