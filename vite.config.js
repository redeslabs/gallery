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
        hallway: 'hallway.html',
        // Include all JavaScript files as explicit entry points
        mainJs: 'main.js',
        hallJs: 'hall.js',
        detailViewJs: 'detailView.js',
        backgroundJs: 'background.js',
        galleryDataJs: 'galleryData.js',
        loadingJs: 'loading.js',
        pathFixJs: 'pathFix.js'
      }
    }
  },
  publicDir: './public',
}
