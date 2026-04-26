import { defineConfig } from 'vite';

// Static output suitable for itch.io + Wavedash. No dev server config needed —
// defaults work. `base: './'` makes asset paths relative so the bundle runs
// when unzipped into any subdirectory (itch hosts games under hashed paths).
//
// We let Rollup natural-chunk most of node_modules (viem / three / tone go
// wherever they're imported from). The Coinbase Smart Wallet SDK is the only
// dependency we explicitly bucket — it's a fat dynamic-imported chunk so
// keeping it isolated keeps the lazy-load story clean and stops Rollup from
// inlining stray dependencies into the main index bundle.
//
// History note: an earlier build used thirdweb here and blew itch.io's
// 1000-file limit (1063 files from ~460 chain-defs + ~460 wallet icons).
// thirdweb has been replaced with @coinbase/wallet-sdk because the latter
// requires no developer signup, no clientId, and no credit card.
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
          if (id.includes('node_modules/@coinbase/wallet-sdk')) {
            return 'coinbase-wallet';
          }
          return undefined;
        },
      },
    },
  },
});
