import { defineConfig } from 'vite';

// Static output suitable for itch.io + Wavedash. No dev server config needed —
// defaults work. `base: './'` makes asset paths relative so the bundle runs
// when unzipped into any subdirectory (itch hosts games under hashed paths).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep chunk names stable + readable for the Open Source judges who
        // might poke at the shipped bundle.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
