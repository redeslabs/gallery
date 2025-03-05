/**
* @type {import('vite').UserConfig}
*/
export default {
  // Set the base directory for GitHub pages
  base: '',  // Empty base path to use relative paths
  build: {
    outDir: './dist',
    sourcemap: true,
  },
  publicDir: './public',
}
