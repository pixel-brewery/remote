// #region Imports
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
// #endregion

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    test: { include: ['src/**/*.spec.ts'], maxWorkers: 1 },
});
