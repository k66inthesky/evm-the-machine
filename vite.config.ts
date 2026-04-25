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
          // Collapse ONLY the thirdweb tree (which is what blew the file
          // count — ~460 chain-defs + ~460 wallet icons). thirdweb pulls
          // its own copy of viem + noble + ox internally, so we bucket
          // those WITH thirdweb to avoid cross-chunk TDZ errors at boot.
          //
          // Earlier attempt split viem into its own chunk too — that
          // broke at runtime with "Cannot access 'Va' before initialization"
          // because thirdweb's chunk referenced the viem chunk before
          // viem's module body had executed. Keeping them together fixes it.
          //
          // viem used directly from src/chain/chain.ts (the public RPC
          // client) is a STATIC import, so Rollup keeps that copy in the
          // main index chunk — the home screen still doesn't pay the
          // thirdweb cost until the player clicks CLAIM WITH GOOGLE.
          if (
            id.includes('node_modules/thirdweb') ||
            id.includes('node_modules/ox')
          ) {
            return 'thirdweb';
          }
          return undefined;
        },
      },
    },
  },
});
