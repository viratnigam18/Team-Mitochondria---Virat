import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ['gsap'],
          lenis: ['lenis']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
