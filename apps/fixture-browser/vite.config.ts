// #region Imports
import { defineConfig } from 'vite';
// #endregion

export default defineConfig({ base: './', build: { outDir: 'dist', target: 'es2022' } });
