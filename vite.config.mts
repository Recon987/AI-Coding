import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins: [react(), {
  name: 'local-development-csp', apply: 'serve',
  transformIndexHtml: html => html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/, '')
 }],
 base: './'
});
