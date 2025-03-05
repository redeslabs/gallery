import fs from 'fs';
import path from 'path';

// List of JS files to process
const jsFiles = [
  'main.js',
  'hall.js',
  'detailView.js',
  'background.js',
  'galleryData.js',
  'loading.js'
];

// Function to recursively copy a directory
function copyDirectoryRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy three.js and tween.js from node_modules and add them to dist
try {
  // Copy three.js
  fs.copyFileSync('./node_modules/three/build/three.module.js', './dist/three.module.js');
  console.log('Copied three.module.js to dist');

  // Create a simple tween.js stub
  fs.writeFileSync('./dist/tween.js', 'export const TWEEN = {};\n');
  console.log('Created tween.js stub in dist');

  // Copy assets directory
  copyDirectoryRecursive('./assets', './dist/assets');
  console.log('Copied assets directory to dist');
  
  // Copy paintings.csv from public directory
  fs.copyFileSync('./public/paintings.csv', './dist/paintings.csv');
  console.log('Copied paintings.csv to dist');
  
  // Copy other files from public directory that may be needed
  const publicFiles = ['left.png', 'right.png', 'mountain.jpg', 'socrates.jpg', 'spring.jpg', 'stars.jpg', 'sunday.jpg', 'wave.jpg'];
  publicFiles.forEach(file => {
    if (fs.existsSync(`./public/${file}`)) {
      fs.copyFileSync(`./public/${file}`, `./dist/${file}`);
      console.log(`Copied ${file} to dist`);
    }
  });

  // Copy addons
  const addonsSrc = './node_modules/three/examples/jsm';
  const addonsDest = './dist/three/addons';
  
  if (!fs.existsSync('./dist/three')) {
    fs.mkdirSync('./dist/three', { recursive: true });
  }
  if (!fs.existsSync(addonsDest)) {
    fs.mkdirSync(addonsDest, { recursive: true });
  }
  
  // Create the objects and controls directories
  if (!fs.existsSync(`${addonsDest}/objects`)) {
    fs.mkdirSync(`${addonsDest}/objects`, { recursive: true });
  }
  if (!fs.existsSync(`${addonsDest}/controls`)) {
    fs.mkdirSync(`${addonsDest}/controls`, { recursive: true });
  }
  
  // Copy the specific files needed (Reflector.js and PointerLockControls.js)
  fs.copyFileSync(`${addonsSrc}/objects/Reflector.js`, `${addonsDest}/objects/Reflector.js`);
  fs.copyFileSync(`${addonsSrc}/controls/PointerLockControls.js`, `${addonsDest}/controls/PointerLockControls.js`);
  console.log('Copied three.js addons to dist');

  // Fix imports in JS files
  jsFiles.forEach(file => {
    if (fs.existsSync(`./dist/${file}`)) {
      let content = fs.readFileSync(`./dist/${file}`, 'utf8');
      
      // Replace module imports - make sure to maintain quote consistency
      content = content.replace(/from ['"]three['"]/g, 'from "./three.module.js"');
      content = content.replace(/from ['"]three\/addons\/([^'"]+)['"]/g, 'from "./three/addons/$1"');
      content = content.replace(/from ['"]tween['"]/g, 'from "./tween.js"');
      
      // Fix galleryData.js to add missing setupDefaultData function
      if (file === 'galleryData.js') {
        // Add setupDefaultData function if it doesn't exist
        if (!content.includes('function setupDefaultData')) {
          const setupDefaultFunction = `
// Default data setup function in case CSV loading fails
function setupDefaultData() {
  console.log('Using default gallery data');
  images = [
    'mountain.jpg',
    'wave.jpg',
    'stars.jpg',
    'spring.jpg',
    'socrates.jpg',
    'sunday.jpg'
  ];
  titles = [
    'Mountain View',
    'Ocean Wave',
    'Starry Night',
    'Spring Blossoms',
    'Socrates',
    'Sunday Afternoon'
  ];
  artists = [
    'Jane Doe',
    'John Smith',
    'Alice Johnson',
    'Bob Brown',
    'Sarah White',
    'Michael Green'
  ];
  paintingDetails = images.map((img, index) => ({
    id: 'ART' + (index + 1000),
    price: (index + 1) * 1000,
    description: 'A beautiful painting titled ' + titles[index] + ' by ' + artists[index],
    year: 2020 + index,
    toSell: index % 2 === 0,
    auction: index % 3 === 0,
    dateEndingAuction: '',
    available: true,
    currentOwner: 'Gallery',
    authenticatedBy: ['REDES Gallery'],
    commentsOfSeller: 'Original painting'
  }));
  paintingCount = images.length;
}
`;
          
          // Insert the function before the closing brace
          content = content.replace(/}\s*$/, setupDefaultFunction + '}\n');
        }
      }
      
      fs.writeFileSync(`./dist/${file}`, content);
      console.log(`Fixed imports in ${file}`);
    }
  });

  console.log('Import fixing completed successfully!');
} catch (err) {
  console.error('Error fixing imports:', err);
} 
