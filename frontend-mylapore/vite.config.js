import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The main admin panel runs on 5174. Put the Mylapore constituency
// panel on 5175 so both can run side-by-side in development without
// colliding.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
});
