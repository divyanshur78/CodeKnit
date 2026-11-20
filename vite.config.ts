import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^monaco-editor\/esm\/vs\/editor\/editor\.api\.js$/,
        replacement: resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.api.js'),
      },
    ],
  },
})
