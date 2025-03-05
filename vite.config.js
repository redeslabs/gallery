/**
 * @type {import('vite').UserConfig}
 */
export default {
  // Set the base directory for GitHub pages
  base: process.env.NODE_ENV === 'production' ? '/gallery/' : '',  // Set to the repository name for GitHub Pages
  build: {
    outDir: './dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        hallway: 'hallway.html'
      }
    }
  },
  publicDir: './public',
}
