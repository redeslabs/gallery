/**
* @type {import('vite').UserConfig}
*/
export default {
  // Set the base directory for GitHub pages
  base: '/gallery/',  // Set to the repository name for GitHub Pages
  build: {
    outDir: './dist',
    sourcemap: true,
  },
  publicDir: './public',
}
