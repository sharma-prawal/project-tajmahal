import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tsconfigPaths()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    // Public production source maps ship the full source tree alongside the
    // bundle. Keep them for local/staging builds; disable for production —
    // upload maps to an error-reporting service out-of-band instead if
    // symbolicated stack traces are needed.
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/') || id.includes('@react-three/fiber') || id.includes('@react-three/drei')) return 'vendor-three';
          if (id.includes('@dimforge/rapier3d') || id.includes('@react-three/rapier')) return 'vendor-physics';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('zustand')) return 'vendor-state';
          // Leave transitive helpers with their importing graph. A catch-all
          // vendor chunk creates a Rollup cycle with drei/Three.js add-ons.
          return undefined;
        },
      },
    },
  },
}));
