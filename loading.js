import * as THREE from 'three';

// Loading manager to track all asset loading
const loadingManager = new THREE.LoadingManager();
let loadingScreen;
let progressBar;
let logoContainer;
let loadingText;

// Initialize the loading screen
function createLoadingScreen() {
  // Create loading overlay
  loadingScreen = document.createElement('div');
  loadingScreen.style.position = 'fixed';
  loadingScreen.style.top = '0';
  loadingScreen.style.left = '0';
  loadingScreen.style.width = '100%';
  loadingScreen.style.height = '100%';
  loadingScreen.style.backgroundColor = '#000';
  loadingScreen.style.display = 'flex';
  loadingScreen.style.flexDirection = 'column';
  loadingScreen.style.alignItems = 'center';
  loadingScreen.style.justifyContent = 'center';
  loadingScreen.style.zIndex = '9999';
  
  // Create logo container
  logoContainer = document.createElement('div');
  logoContainer.style.position = 'relative';
  logoContainer.style.width = '300px';
  logoContainer.style.height = '150px';
  logoContainer.style.overflow = 'hidden';
  
  // Create the logo image (visible part)
  const logoVisible = document.createElement('img');
  logoVisible.src = 'assets/redes-logo.png';
  logoVisible.style.width = '100%';
  logoVisible.style.height = '100%';
  logoVisible.style.position = 'absolute';
  logoVisible.style.objectFit = 'contain';
  logoVisible.style.clipPath = 'inset(0 100% 0 0)'; // Start with fully hidden logo
  logoVisible.id = 'logo-visible';
  
  // Create logo "background" image (dim version of the logo)
  const logoBackground = document.createElement('img');
  logoBackground.src = 'assets/redes-logo.png';
  logoBackground.style.width = '100%';
  logoBackground.style.height = '100%';
  logoBackground.style.position = 'absolute';
  logoBackground.style.objectFit = 'contain';
  logoBackground.style.opacity = '0.2'; // Dim background version
  
  // Add both logo elements to container
  logoContainer.appendChild(logoBackground);
  logoContainer.appendChild(logoVisible);
  
  // Create loading text
  loadingText = document.createElement('div');
  loadingText.textContent = 'Loading assets... 0%';
  loadingText.style.color = '#fff';
  loadingText.style.marginTop = '20px';
  loadingText.style.fontFamily = 'Arial, sans-serif';
  
  // Append elements to loading screen
  loadingScreen.appendChild(logoContainer);
  loadingScreen.appendChild(loadingText);
  
  // Add loading screen to document
  document.body.appendChild(loadingScreen);
}

// Initialize the loading manager
function initLoadingManager() {
  // Create the loading screen
  createLoadingScreen();
  
  // Update progress as items load
  loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
    updateLoadingProgress(progress);
  };
  
  // Handle loading complete
  loadingManager.onLoad = function() {
    // Ensure we show 100% complete
    updateLoadingProgress(100);
    
    // Wait a moment to show the completed progress before hiding
    setTimeout(() => {
      hideLoadingScreen();
    }, 500);
  };
  
  // Handle loading error
  loadingManager.onError = function(url) {
    console.error('Error loading: ' + url);
    loadingText.textContent = 'Error loading assets. Please refresh the page.';
    loadingText.style.color = '#ff0000';
  };
  
  return loadingManager;
}

// Update the loading progress display
function updateLoadingProgress(progress) {
  // Update the logo reveal by changing clip path
  const logoVisible = document.getElementById('logo-visible');
  logoVisible.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
  
  // Update loading text
  loadingText.textContent = `Loading assets... ${progress}%`;
}

// Hide loading screen with fade out animation
function hideLoadingScreen() {
  // Fade out animation
  loadingScreen.style.transition = 'opacity 1s ease-in-out';
  loadingScreen.style.opacity = '0';
  
  // Remove from DOM after fade
  setTimeout(() => {
    if (loadingScreen.parentNode) {
      loadingScreen.parentNode.removeChild(loadingScreen);
    }
  }, 1000);
}

export { initLoadingManager, loadingManager }; 