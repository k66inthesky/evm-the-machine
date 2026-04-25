import { defineConfig } from 'vite';

// Static output suitable for itch.io + Wavedash. No dev server config needed —
// defaults work. `base: './'` makes asset paths relative so the bundle runs
// when unzipped into any subdirectory (itch hosts games under hashed paths).
//
// File-count budget: itch.io enforces a 1000-file limit per zip. thirdweb's
// tree-shakeable design produces ~460 chain-definition chunks plus ~460 wallet
// icon chunks (1063 total), which busts the limit. We collapse the thirdweb
// surface into one bucket via manualChunks below — the dynamic-import
// boundary remains (still lazy-loads only when the player clicks
// "CLAIM WITH GOOGLE"), but internally it's one chunk instead of hundreds.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/thirdweb')) return 'thirdweb';
          if (id.includes('node_modules/ox')) return 'thirdweb';
          if (id.includes('node_modules/@noble')) return 'noble-crypto';
          if (id.includes('node_modules/viem')) return 'viem';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/tone')) return 'tone';
          return undefined;
        },
      },
    },
  },
});
