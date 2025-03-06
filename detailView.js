// detailView.js - Manages the detail view and 3D painting rendering

import * as THREE from 'three';
import { images, titles, artists, paintingDetails } from './galleryData.js';

// Need to get the loading manager from main.js
let loadingManager;

// Set loading manager to be used in this module
export function setLoadingManager(manager) {
  loadingManager = manager;
}

// Function to format price nicely
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price);
}

// Function to get the full path to an image
function getImagePath(imageName) {
  // Make sure we're working with a clean image name
  const cleanImageName = imageName.trim();
  
  // Check if the path already starts with a slash
  if (cleanImageName.startsWith('/gallery/')) {
    return cleanImageName; // Already has a leading slash
  }
  
  // Create the proper path
  const fullPath = '/gallery/' + cleanImageName;
  console.log(`Image path resolved: "${cleanImageName}" → "${fullPath}"`);
  return fullPath;
}

/**
 * Show the detail view for a painting
 * @param {number} index - The index of the painting to show
 * @param {Array} images - Array of image filenames
 * @param {Array} titles - Array of painting titles
 * @param {Array} artists - Array of artist names
 * @param {Array} paintingDetails - Array of painting details objects
 * @param {object} mainRenderer - The main THREE.js renderer (to adjust opacity)
 */
function showDetailView(index, images, titles, artists, paintingDetails, mainRenderer) {
  console.log("showDetailView called for index:", index);
  
  // Store renderer reference globally for access by contact info close handler
  window.currentRenderer = mainRenderer;
  
  // Save the current state of the main gallery for later restoration
  if (!window.mainGalleryState) {
    window.mainGalleryState = {};
  }
  
  // Just store if the keys are enabled, but we won't modify the main view
  window.mainGalleryState.keyEnabled = window.mainGalleryKeyEnabled || true;
  
  // Disable key handling in the main gallery while detail view is open
  window.mainGalleryKeyEnabled = false;
  
  // Create or get the detail view container
  let detailView = document.getElementById('detailView');
  
  if (!detailView) {
    detailView = document.createElement('div');
    detailView.id = 'detailView';
    document.body.appendChild(detailView);
    
    // Style the detail view to be a complete overlay
    detailView.style.position = 'fixed';
    detailView.style.top = '0';
    detailView.style.left = '0';
    detailView.style.width = '100%';
    detailView.style.height = '100%';
    detailView.style.backgroundColor = 'rgba(0, 0, 0, 1)'; // Fully opaque background
    detailView.style.zIndex = '1000'; // Ensure it's above everything else
    detailView.style.display = 'flex'; // IMPORTANT: Make it visible with flex display
    detailView.style.justifyContent = 'center';
    detailView.style.alignItems = 'center';
    detailView.style.overflow = 'auto';
  }
  
  const painting = paintingDetails[index];
  
  // Format the auction end date if it exists
  let auctionInfo = '';
  if (painting.auction) {
    const endDate = painting.dateEndingAuction ? new Date(painting.dateEndingAuction) : null;
    const formattedDate = endDate ? endDate.toLocaleDateString() : 'TBD';
    auctionInfo = `<p class="auction-info">This painting is available at auction ending on: ${formattedDate}</p>`;
  }
  
  // Format the authentication information
  const authenticatedInfo = painting.authenticatedBy ? 
    `<p class="authentication">Authenticated by: ${Array.isArray(painting.authenticatedBy) ? 
      painting.authenticatedBy.join(', ') : painting.authenticatedBy}</p>` : '';
  
  // Format availability information
  const availabilityInfo = `<p class="availability">Availability: ${painting.available ? 'Available for purchase' : 'Currently not available'}</p>`;
  
  // Format current owner information
  const ownerInfo = painting.currentOwner ? 
    `<p class="owner-info">Current owner: ${painting.currentOwner}</p>` : '';
  
  // Format seller comments if they exist
  const sellerComments = painting.commentsOfSeller ? 
    `<div class="seller-comments">
      <h4>Seller Comments:</h4>
      <p>${painting.commentsOfSeller}</p>
    </div>` : '';
  
  detailView.innerHTML = `
    <div class="detail-content">
      <button id="closeDetailBtn" class="close-button">×</button>
      
      <div class="painting-container">
        <div id="threeDContainer"></div>
        <div class="image-loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading image...</div>
        </div>
        <div class="zoom-instructions">Drag to rotate • Scroll to zoom • Double-click to auto-rotate</div>
      </div>
      
      <div class="painting-details">
        <h2>${titles[index]}</h2>
        <h3>By ${artists[index]}, ${painting.year}</h3>
        <div class="painting-id">ID: ${painting.id}</div>
        <p>${painting.description}</p>
        ${painting.toSell ? `
          <p class="price">Price: ${formatPrice(painting.price)}</p>
          ${auctionInfo}
          ${availabilityInfo}
          ${ownerInfo}
          ${authenticatedInfo}
          ${sellerComments}
          <div class="action-buttons">
            ${painting.available ? '<button id="buyButton">Purchase</button>' : 
              '<button disabled>Currently Unavailable</button>'}
          </div>
        ` : '<p>This painting is not for sale.</p>'}
      </div>
    </div>
  `;
  
  detailView.style.display = 'flex';
  
  // Add styles for the new elements
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .painting-details .authentication,
    .painting-details .availability,
    .painting-details .owner-info,
    .painting-details .auction-info {
      margin: 5px 0;
      font-size: 0.9em;
    }
    
    .painting-details .seller-comments {
      margin-top: 15px;
      padding: 10px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
    }
    
    .painting-details .seller-comments h4 {
      margin-top: 0;
      color: #e0e0e0;
    }
    
    .detail-content {
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .image-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 10;
      pointer-events: none;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #00ffff;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 15px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
    
    .painting-container {
      position: relative;
    }
    
    .close-button {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      color: white;
      font-size: 2em;
      cursor: pointer;
      z-index: 1100;
      padding: 10px;
      line-height: 0.7;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.4);
      transition: background-color 0.3s;
    }
    
    .close-button:hover {
      background-color: rgba(255, 0, 0, 0.6);
    }
  `;
  document.head.appendChild(styleElement);
  
  // Hide instructions when detail view is open
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.style.display = 'none';
  }
  
  // Store the current animation state of the main gallery to restore later
  window.mainGalleryState = {
    isAnimating: window.mainGalleryAnimating || false
  };
  
  // Pause main gallery animation while detail view is open
  window.mainGalleryAnimating = false;
  
  // Disable main gallery interaction and make it slightly darker
  if (mainRenderer && mainRenderer.domElement) {
    // Store current opacity
    window.mainGalleryState.opacity = mainRenderer.domElement.style.opacity || '1';
    // Completely hide the main gallery while detail view is open
    mainRenderer.domElement.style.opacity = '0';
    mainRenderer.domElement.style.pointerEvents = 'none';
  }
  
  // Hide any other UI elements related to main gallery
  const controlsContainer = document.querySelector('div[style*="bottom: 80px"][style*="left: 50%"]');
  if (controlsContainer) {
    window.mainGalleryState.controlsDisplay = controlsContainer.style.display;
    controlsContainer.style.display = 'none';
  }
  
  // Hide other UI elements that might be visible
  const uiElements = document.querySelectorAll('.ui-element, #audioControls, #paintingLabel');
  uiElements.forEach(element => {
    if (element) {
      element.dataset.originalDisplay = element.style.display;
      element.style.display = 'none';
    }
  });
  
  // Create a full overlay behind the detail view for better focus
  let overlay = document.getElementById('detailViewOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'detailViewOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#000';
    overlay.style.zIndex = '99';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
  
  // Add event listener for the close button - directly after creating the detail view
  // instead of at the end of the function
  const closeBtn = document.getElementById('closeDetailBtn');
  if (closeBtn) {
    // Ensure we only have one listener
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    
    // Get the fresh reference
    const newCloseBtn = document.getElementById('closeDetailBtn');
    newCloseBtn.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      console.log("Main detail view close button clicked");
      // Add a delay to ensure all resources are cleaned up properly
      setTimeout(() => {
        closeDetailView(mainRenderer);
      }, 10);
    });
  }
  
  // Only add purchase button listener if the button exists (painting is available)
  const buyButton = document.getElementById('buyButton');
  if (buyButton) {
    buyButton.addEventListener('click', () => {
      showContactInfo(index, titles[index], painting);
    });
  }
  
  // Prevent clicks in the detail view from affecting the background
  detailView.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  
  // Prevent wheel events from propagating to the background
  detailView.addEventListener('wheel', (event) => {
    event.stopPropagation();
  }, { passive: false });
  
  // Prevent keyboard events from affecting the background
  detailView.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });
  
  // Make sure we're not in first person mode when entering detail view
  if (window.controls && document.pointerLockElement) {
    window.controls.unlock();
  }
  
  // Allow the DOM to update before creating the 3D scene
  setTimeout(() => {
    // Create a 3D painting display
    create3DPainting(index, images, titles);
    
    // Show zoom instructions briefly
    showZoomInstructions();
  }, 50);
}

/**
 * Create a 3D representation of a painting
 * @param {number} index - The index of the painting to display
 * @param {Array} images - Array of image filenames
 * @param {Array} titles - Array of painting titles
 */
function create3DPainting(index, images, titles) {
  console.log("==== CREATING 3D PAINTING ====");
  
  // Get the container first
  const container = document.getElementById('threeDContainer');
  if (!container) {
    console.error("CRITICAL ERROR: 3D container not found in DOM");
    return;
  }
  
  // Clear any existing content
  container.innerHTML = '';
  
  // Check if THREE is available
  if (typeof THREE === 'undefined') {
    console.error("CRITICAL ERROR: THREE.js is not defined");
    container.innerHTML = `
      <div style="padding: 20px; color: red; background: black; text-align: center;">
        <h3>3D Rendering Error</h3>
        <p>THREE.js library is not available</p>
      </div>
    `;
    return;
  }
  
  try {
    // Create a scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);
    
    // Create camera with perspective
    const camera = new THREE.PerspectiveCamera(
      45, 
      container.clientWidth / container.clientHeight, 
      0.01, // Changed from 0.1 to 0.01 for better close-up rendering
      1000
    );
    camera.position.z = 5;
    
    // Create renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      // Add high precision for better detail rendering
      precision: 'highp'
    });
    
    // Set renderer size and append to container
    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 300);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    
    // Lighting setup
    // Add ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light to create shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    scene.add(directionalLight);
    
    // Add rim light from behind for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(-1, 0, -1);
    scene.add(rimLight);
    
    // Create a group to hold all painting elements
    const paintingGroup = new THREE.Group();
    
    // Initial dimensions - will be updated when image loads
    const defaultWidth = 3;
    const defaultHeight = 2;
    const frameDepth = 0.1;
    const frameBorderWidth = 0.15;
    
    // Create frame materials
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x332211, // Dark wood color
      metalness: 0.3,
      roughness: 0.8
    });
    
    const frameAccentMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xB8860B, // Gold color
      metalness: 0.7,
      roughness: 0.3
    });
    
    // Create outer frame
    const outerFrameGeometry = new THREE.BoxGeometry(defaultWidth, defaultHeight, frameDepth);
    const outerFrame = new THREE.Mesh(outerFrameGeometry, frameMaterial);
    paintingGroup.add(outerFrame);
    
    // Create inner gold trim
    const innerFrameGeometry = new THREE.BoxGeometry(
      defaultWidth - frameBorderWidth/2, 
      defaultHeight - frameBorderWidth/2, 
      frameDepth + 0.01
    );
    const innerFrame = new THREE.Mesh(innerFrameGeometry, frameAccentMaterial);
    innerFrame.position.z = 0.01;
    paintingGroup.add(innerFrame);
    
    // Create canvas for the painting
    const canvasGeometry = new THREE.PlaneGeometry(
      defaultWidth - frameBorderWidth*2,
      defaultHeight - frameBorderWidth*2
    );
    // Use a BasicMaterial for the placeholder - it's not affected by lighting
    const placeholderMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x888888,
      side: THREE.FrontSide
    });
    const canvasMesh = new THREE.Mesh(canvasGeometry, placeholderMaterial);
    // Position it more clearly in front of the frame
    canvasMesh.position.z = frameDepth/2 + 0.02; 
    paintingGroup.add(canvasMesh);
    
    // Add a debug box to visualize where the canvas should be
    const debugBoxGeometry = new THREE.BoxGeometry(
      defaultWidth - frameBorderWidth*2,
      defaultHeight - frameBorderWidth*2,
      0.01
    );
    const debugBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF0000,
      wireframe: true
    });
    const debugBox = new THREE.Mesh(debugBoxGeometry, debugBoxMaterial);
    debugBox.position.copy(canvasMesh.position);
    paintingGroup.add(debugBox);
    
    // Create canvas backing
    const backingGeometry = new THREE.BoxGeometry(
      defaultWidth - frameBorderWidth*2 - 0.01,
      defaultHeight - frameBorderWidth*2 - 0.01,
      0.02
    );
    const backingMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC }); // Off-white
    const backing = new THREE.Mesh(backingGeometry, backingMaterial);
    backing.position.z = -frameDepth/2 - 0.01;
    paintingGroup.add(backing);
    
    // Add painting group to scene
    scene.add(paintingGroup);
    
    // Set initial rotation for a more interesting presentation
    paintingGroup.rotation.y = -Math.PI/10;
    paintingGroup.rotation.x = Math.PI/20;
    
    // Movement variables for WASD controls
    let movementDirection = {
      w: false,
      a: false,
      s: false,
      d: false
    };
    const movementSpeed = 0.05; // Speed of movement
    
    // Load the image texture
    const textureLoader = loadingManager ? new THREE.TextureLoader(loadingManager) : new THREE.TextureLoader();
    
    // Get the correct image path
    const imagePath = getImagePath(images[index]);
    console.log(`Loading painting texture for "${titles[index]}": ${imagePath}`);
    
    // Show a loading indicator on the canvas
    const canvasContext = document.createElement('canvas').getContext('2d');
    canvasContext.canvas.width = 512;
    canvasContext.canvas.height = 512;
    canvasContext.fillStyle = '#444444';
    canvasContext.fillRect(0, 0, 512, 512);
    canvasContext.font = 'bold 40px Arial';
    canvasContext.textAlign = 'center';
    canvasContext.fillStyle = 'white';
    canvasContext.fillText('Loading...', 256, 256);
    
    const loadingTexture = new THREE.CanvasTexture(canvasContext.canvas);
    canvasMesh.material = new THREE.MeshBasicMaterial({ map: loadingTexture });
    
    textureLoader.load(
      imagePath,
      // onLoad callback
      function(texture) {
        console.log(`✅ Texture loaded successfully for "${titles[index]}"`);
        console.log(`   Image dimensions: ${texture.image.width}x${texture.image.height}`);
        
        // Hide the loading overlay since the image has loaded
        const loadingOverlay = document.querySelector('.image-loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.style.display = 'none';
        }
        
        // Apply maximum anisotropic filtering for better quality at angles
        if (renderer.capabilities.getMaxAnisotropy) {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          console.log(`   Applied max anisotropic filtering: ${texture.anisotropy}x`);
        }
        
        // Enable mipmaps for better quality at different zoom levels
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        // Calculate aspect ratio of the loaded image
        const aspectRatio = texture.image.width / texture.image.height;
        console.log(`   Aspect ratio: ${aspectRatio}`);
        
        // Update geometry to match aspect ratio while maintaining a consistent size
        const frameHeight = 3; // Fixed height
        const frameWidth = frameHeight * aspectRatio; // Width based on aspect ratio
        
        // Update all geometries with the correct aspect ratio
        function updateGeometry(mesh, width, height, depth = 0.01) {
          if (mesh && mesh.geometry) {
            mesh.geometry.dispose(); // Clean up old geometry
            mesh.geometry = depth > 0.01 ? 
              new THREE.BoxGeometry(width, height, depth) :
              new THREE.PlaneGeometry(width, height);
          }
        }
        
        // Update all the frame meshes
        updateGeometry(outerFrame, frameWidth, frameHeight, frameDepth);
        updateGeometry(innerFrame, frameWidth - frameBorderWidth/2, frameHeight - frameBorderWidth/2, frameDepth + 0.01);
        updateGeometry(canvasMesh, frameWidth - frameBorderWidth*2, frameHeight - frameBorderWidth*2);
        updateGeometry(debugBox, frameWidth - frameBorderWidth*2, frameHeight - frameBorderWidth*2, 0.01);
        updateGeometry(backing, frameWidth - frameBorderWidth*2 - 0.01, frameHeight - frameBorderWidth*2 - 0.01, 0.02);
        
        // Create a material with the texture - use MeshBasicMaterial for reliable display
        const paintingMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.FrontSide
        });
        
        // Apply the material to the canvas mesh
        canvasMesh.material = paintingMaterial;
        
        // Hide the debug box once the texture is loaded
        debugBox.visible = false;
        
        // Force a render to show the new texture
        renderer.render(scene, camera);
      },
      // onProgress callback
      function(xhr) {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log('Texture loading: ' + Math.round(percentComplete) + '%');
        }
      },
      // onError callback
      function(error) {
        console.error(`❌ Error loading texture for "${titles[index]}":`, error);
        
        // Update the loading overlay to show an error instead
        const loadingOverlay = document.querySelector('.image-loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.innerHTML = `
            <div class="loading-error">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <div class="loading-text">Error loading image</div>
            </div>
          `;
        }
        
        // Create an error texture
        const errorContext = document.createElement('canvas').getContext('2d');
        errorContext.canvas.width = 512;
        errorContext.canvas.height = 512;
        errorContext.fillStyle = '#550000';
        errorContext.fillRect(0, 0, 512, 512);
        errorContext.font = 'bold 30px Arial';
        errorContext.textAlign = 'center';
        errorContext.fillStyle = 'white';
        errorContext.fillText('Error loading image', 256, 220);
        errorContext.fillText(images[index], 256, 260);
        errorContext.fillText('Check console for details', 256, 320);
        
        const errorTexture = new THREE.CanvasTexture(errorContext.canvas);
        canvasMesh.material = new THREE.MeshBasicMaterial({ map: errorTexture });
      }
    );
    
    // Add user interaction controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let autoRotate = false;
    let autoRotateSpeed = 0.01;
    
    // Define event handlers with named functions to enable removal
    function onMouseDown(e) {
      isDragging = true;
      previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
      autoRotate = false; // Disable auto-rotate when user interacts
      e.stopPropagation(); // Prevent event from reaching background
    }
    
    function onMouseMove(e) {
      if (!isDragging) return;
      
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };
      
      // Adjust rotation based on mouse movement
      paintingGroup.rotation.y += deltaMove.x * 0.005;
      paintingGroup.rotation.x += deltaMove.y * 0.005;
      
      // Limit vertical rotation to prevent seeing the back too much
      paintingGroup.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, paintingGroup.rotation.x));
      
      previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
      
      e.stopPropagation(); // Prevent event from reaching background
      e.preventDefault(); // Prevent any default browser behavior
    }
    
    function onMouseUp(e) {
      isDragging = false;
      e.stopPropagation(); // Prevent event from reaching background
    }
    
    function onMouseOut(e) {
      isDragging = false;
      e.stopPropagation(); // Prevent event from reaching background
    }
    
    function onDoubleClick(e) {
      autoRotate = !autoRotate;
      e.stopPropagation(); // Prevent event from reaching background
    }
    
    function onWheel(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from reaching background
      
      // Calculate zoom factor based on scroll direction
      const zoomFactor = 0.1;
      const zoomAmount = e.deltaY > 0 ? zoomFactor : -zoomFactor;
      
      // Apply zoom by moving camera - allow getting much closer (0.2 instead of 2.5)
      // This allows for extreme close-ups to see fine details
      camera.position.z = Math.max(0.2, Math.min(8, camera.position.z + zoomAmount));
      
      // When very close, show tooltip with zoom level
      const zoomPercentage = Math.round((1 - ((camera.position.z - 0.2) / 7.8)) * 100);
      
      // Only show tooltip when zoomed in significantly
      if (zoomPercentage > 70) {
        showZoomTooltip(zoomPercentage);
      } else {
        hideZoomTooltip();
      }
      
      // Update field of view for more natural zoom feeling when very close
      if (camera.position.z < 1.0) {
        // Gradually decrease FOV when very close for more detail
        camera.fov = 45 - (1.0 - camera.position.z) * 10;
        camera.updateProjectionMatrix();
      } else if (camera.fov !== 45) {
        // Reset to default FOV
        camera.fov = 45;
        camera.updateProjectionMatrix();
      }
    }
    
    // Create tooltip for zoom level if it doesn't exist
    let zoomTooltip;
    function showZoomTooltip(percentage) {
      if (!zoomTooltip) {
        zoomTooltip = document.createElement('div');
        zoomTooltip.style.position = 'absolute';
        zoomTooltip.style.bottom = '20px';
        zoomTooltip.style.right = '20px';
        zoomTooltip.style.background = 'rgba(0,0,0,0.7)';
        zoomTooltip.style.color = 'white';
        zoomTooltip.style.padding = '8px 12px';
        zoomTooltip.style.borderRadius = '4px';
        zoomTooltip.style.fontFamily = 'Arial, sans-serif';
        zoomTooltip.style.fontSize = '14px';
        zoomTooltip.style.transition = 'opacity 0.3s';
        zoomTooltip.style.zIndex = '1000';
        container.appendChild(zoomTooltip);
      }
      
      zoomTooltip.textContent = `Zoom: ${percentage}%`;
      zoomTooltip.style.opacity = '1';
    }
    
    function hideZoomTooltip() {
      if (zoomTooltip) {
        zoomTooltip.style.opacity = '0';
      }
    }
    
    function onResize() {
      const newWidth = Math.max(container.clientWidth, 300);
      const newHeight = Math.max(container.clientHeight, 300);
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    }
    
    // Store references to event handlers for cleanup
    container.__mousedownHandler = onMouseDown;
    container.__mousemoveHandler = onMouseMove;
    container.__mouseupHandler = onMouseUp;
    container.__mouseoutHandler = onMouseOut;
    container.__dblclickHandler = onDoubleClick;
    container.__wheelHandler = onWheel;
    container.__resizeHandler = onResize;
    
    // Add event listeners
    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseout', onMouseOut);
    container.addEventListener('dblclick', onDoubleClick);
    container.addEventListener('wheel', onWheel);
    window.addEventListener('resize', onResize);
    
    // Add keyboard event listeners for WASD movement
    function onKeyDown(e) {
      const key = e.key.toLowerCase();
      
      // Handle WASD keys for movement
      if (['w', 'a', 's', 'd'].includes(key)) {
        movementDirection[key] = true;
        e.preventDefault(); // Prevent default browser behavior
        e.stopPropagation(); // Prevent event from reaching background
      } 
      // Handle R key for resetting position
      else if (key === 'r') {
        // Reset position and rotation
        paintingGroup.position.set(0, 0, 0);
        paintingGroup.rotation.set(Math.PI/20, -Math.PI/10, 0);
        
        // Show reset notification
        const notification = document.createElement('div');
        notification.textContent = 'Position Reset';
        notification.style.position = 'absolute';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = 'rgba(0,0,0,0.7)';
        notification.style.color = 'white';
        notification.style.padding = '8px 15px';
        notification.style.borderRadius = '4px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '1000';
        
        container.appendChild(notification);
        
        // Remove notification after 1.5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 1500);
        
        e.preventDefault();
        e.stopPropagation();
      }
    }
    
    function onKeyUp(e) {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        movementDirection[key] = false;
        e.preventDefault(); // Prevent default browser behavior
        e.stopPropagation(); // Prevent event from reaching background
      }
    }
    
    // Store references to keyboard handlers for cleanup
    document.__keydownHandler = onKeyDown;
    document.__keyupHandler = onKeyUp;
    
    // Add keyboard event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Movement controls hint
    const movementHintDiv = document.createElement('div');
    movementHintDiv.className = 'movement-hint';
    movementHintDiv.innerHTML = `
      <div class="hint-content">
        <div class="hint-icon">⌨️</div>
        <div class="hint-text">
          <div>Use <b>W</b>, <b>A</b>, <b>S</b>, <b>D</b> keys to move the painting</div>
          <div>Press <b>R</b> to reset position</div>
        </div>
      </div>
    `;
    
    // Style the hint
    movementHintDiv.style.position = 'absolute';
    movementHintDiv.style.bottom = '30px';
    movementHintDiv.style.left = '20px';
    movementHintDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    movementHintDiv.style.color = 'white';
    movementHintDiv.style.padding = '10px 15px';
    movementHintDiv.style.borderRadius = '8px';
    movementHintDiv.style.fontFamily = 'Arial, sans-serif';
    movementHintDiv.style.fontSize = '14px';
    movementHintDiv.style.zIndex = '1000';
    
    // Add hint to container with a reference for cleanup
    container.__movementHint = movementHintDiv;
    container.appendChild(movementHintDiv);
    
    // Animation function
    function animate() {
      // Auto-rotate if enabled
      if (autoRotate) {
        paintingGroup.rotation.y += autoRotateSpeed;
      }
      
      // Apply WASD movement
      if (movementDirection.w) {
        paintingGroup.position.y += movementSpeed;
      }
      if (movementDirection.s) {
        paintingGroup.position.y -= movementSpeed;
      }
      if (movementDirection.a) {
        paintingGroup.position.x -= movementSpeed;
      }
      if (movementDirection.d) {
        paintingGroup.position.x += movementSpeed;
      }
      
      // Set limits to prevent moving too far off-screen
      const positionLimit = 3;
      paintingGroup.position.x = Math.max(-positionLimit, Math.min(positionLimit, paintingGroup.position.x));
      paintingGroup.position.y = Math.max(-positionLimit, Math.min(positionLimit, paintingGroup.position.y));
      
      // Add subtle floating motion (only if not being moved by WASD)
      if (!movementDirection.w && !movementDirection.s) {
        paintingGroup.position.y += Math.sin(Date.now() * 0.001) * 0.005;
      }
      
      // Render scene
      renderer.render(scene, camera);
      
      // Continue animation loop
      window.requestAnimationFrame(animate);
    }
    
    // Start animation loop
    animate();
    
    // Store renderer reference for cleanup
    renderer.domElement.__renderer = renderer;
    
  } catch (error) {
    console.error("CRITICAL ERROR in 3D painting creation:", error);
    
    // Display error in the container for visibility
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: red; background: black; text-align: center;">
          <h3>3D Rendering Error</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
}

/**
 * Close the detail view and clean up resources
 * @param {object} mainRenderer - The main THREE.js renderer
 */
function closeDetailView(mainRenderer) {
  console.log("closeDetailView called");
  const detailView = document.getElementById('detailView');
  if (!detailView) return;
  
  try {
    // Clean up zoom tooltip if it exists
    if (window.zoomTooltip && window.zoomTooltip.parentNode) {
      window.zoomTooltip.parentNode.removeChild(window.zoomTooltip);
      window.zoomTooltip = null;
    }
    
    // Clean up 3D resources
    const container = document.getElementById('threeDContainer');
    if (container && container.querySelector('canvas')) {
      // Remove canvas and dispose of WebGL context
      const canvas = container.querySelector('canvas');
      if (canvas) {
        // Get the renderer instance
        const renderer = canvas.__renderer;
        
        // Remove event listeners
        if (container.__mousedownHandler) {
          container.removeEventListener('mousedown', container.__mousedownHandler);
        }
        if (container.__mousemoveHandler) {
          document.removeEventListener('mousemove', container.__mousemoveHandler);
        }
        if (container.__mouseupHandler) {
          document.removeEventListener('mouseup', container.__mouseupHandler);
        }
        if (container.__mouseoutHandler) {
          container.removeEventListener('mouseout', container.__mouseoutHandler);
        }
        if (container.__dblclickHandler) {
          container.removeEventListener('dblclick', container.__dblclickHandler);
        }
        if (container.__wheelHandler) {
          container.removeEventListener('wheel', container.__wheelHandler);
        }
        if (container.__keydownHandler) {
          document.removeEventListener('keydown', container.__keydownHandler);
        }
        if (container.__keyupHandler) {
          document.removeEventListener('keyup', container.__keyupHandler);
        }
        
        // Dispose of 3D resources to prevent memory leaks
        if (renderer) {
          try {
            if (renderer.scene) {
              disposeMeshesInScene(renderer.scene);
            }
            renderer.dispose();
          } catch (e) {
            console.error("Error disposing renderer:", e);
          }
        }
      }
    }
    
    // Hide the detail view
    detailView.style.display = 'none';
    
    // Ensure contact info is also closed
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
      contactInfo.style.display = 'none';
    }
    
    // Hide any overlay
    const overlay = document.getElementById('detailViewOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Show the main gallery again by restoring its opacity
    if (mainRenderer && mainRenderer.domElement) {
      mainRenderer.domElement.style.opacity = '1';
      mainRenderer.domElement.style.pointerEvents = 'auto';
    }
    
    // Re-enable key event listeners for the gallery
    if (window.mainGalleryState && window.mainGalleryState.keyEnabled !== undefined) {
      window.mainGalleryKeyEnabled = window.mainGalleryState.keyEnabled;
    } else {
      window.mainGalleryKeyEnabled = true;
    }
    
    // Restore the main gallery animation state if it was previously running
    if (window.mainGalleryState && window.mainGalleryState.isAnimating) {
      window.mainGalleryAnimating = true;
    }
    
    // Show navigation controls again
    const controlsContainer = document.querySelector('div[style*="bottom: 80px"][style*="left: 50%"]');
    if (controlsContainer) {
      controlsContainer.style.display = 'flex';
    }
    
    // Show instructions again if they were previously shown
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'block';
    }
    
    // Remove the detail view content to ensure it's fully reset for next time
    detailView.innerHTML = '';
    
    // Force a render update to ensure the main gallery is visible
    if (mainRenderer && mainRenderer.render) {
      requestAnimationFrame(() => {
        try {
          mainRenderer.render(mainRenderer.scene, mainRenderer.camera);
        } catch (e) {
          console.error("Error rendering main scene:", e);
        }
      });
    }
  } catch (error) {
    console.error("Error in closeDetailView:", error);
    // Even if there's an error, try to at least hide the detail view
    if (detailView) {
      detailView.style.display = 'none';
    }
    // And restore the main renderer
    if (mainRenderer && mainRenderer.domElement) {
      mainRenderer.domElement.style.opacity = '1';
      mainRenderer.domElement.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Show contact information for purchasing a painting
 * @param {number} index - The index of the painting
 * @param {string} title - The title of the painting
 * @param {object} painting - The painting details object
 */
function showContactInfo(index, title, painting) {
  // Create a contact info overlay
  let contactInfo = document.getElementById('contactInfo');
  
  if (!contactInfo) {
    contactInfo = document.createElement('div');
    contactInfo.id = 'contactInfo';
    contactInfo.style.position = 'fixed';
    contactInfo.style.top = '0';
    contactInfo.style.left = '0';
    contactInfo.style.width = '100%';
    contactInfo.style.height = '100%';
    contactInfo.style.backgroundColor = 'rgba(0, 0, 0, 1)'; // Fully opaque
    contactInfo.style.zIndex = '1001'; // Above detail view
    contactInfo.style.display = 'none'; // Initially hidden
    contactInfo.style.justifyContent = 'center';
    contactInfo.style.alignItems = 'center';
    document.body.appendChild(contactInfo);
  }
  
  // Determine the purchase type and additional info
  let purchaseType = "Purchase";
  let additionalInfo = "";
  
  if (painting.auction) {
    purchaseType = "Auction";
    const endDate = painting.dateEndingAuction ? new Date(painting.dateEndingAuction).toLocaleDateString() : 'TBD';
    additionalInfo += `
      <p>This painting is currently at auction ending on: <strong>${endDate}</strong></p>
    `;
  }
  
  // Add authentication information if available
  if (painting.authenticatedBy && Array.isArray(painting.authenticatedBy)) {
    additionalInfo += `
      <p>This painting has been authenticated by:</p>
      <ul class="authentication-list">
        ${painting.authenticatedBy.map(auth => `<li>${auth}</li>`).join('')}
      </ul>
    `;
  }
  
  // Add current owner information if available
  if (painting.currentOwner) {
    additionalInfo += `
      <p>Current owner: <strong>${painting.currentOwner}</strong></p>
    `;
  }
  
  contactInfo.innerHTML = `
    <div class="info-content">
      <button id="closeContactBtn" class="close-button">×</button>
      <h2>${purchaseType} Inquiry</h2>
      <p>Thank you for your interest in <strong>"${title}"</strong>.</p>
      <p>For pricing and availability information, please contact our gallery:</p>
      <p class="email">hello@redeslabs.com</p>
      <p>Please reference the painting ID: <strong>${painting.id}</strong></p>
      ${additionalInfo}
    </div>
  `;
  
  // Add styles for the contact info
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .info-content {
      max-height: 90vh;
      overflow-y: auto;
      padding: 30px;
    }
    
    .authentication-list {
      margin-top: 5px;
      margin-bottom: 15px;
      padding-left: 20px;
    }
  `;
  document.head.appendChild(styleElement);
  
  contactInfo.style.display = 'flex';
  
  // Add close button event listener with improved cleanup
  const contactCloseBtn = document.getElementById('closeContactBtn');
  if (contactCloseBtn) {
    // Ensure we only have one listener
    contactCloseBtn.replaceWith(contactCloseBtn.cloneNode(true));
    
    // Get fresh reference
    const newContactCloseBtn = document.getElementById('closeContactBtn');
    newContactCloseBtn.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      console.log("Contact close button clicked");
      
      // Hide the contact info panel
      contactInfo.style.display = 'none';
      
      // Get the detailView
      const detailView = document.getElementById('detailView');
      
      // If we want to return to the main gallery view, close the detail view too
      if (detailView && detailView.style.display === 'flex') {
        // Use a small timeout to ensure clean transition
        setTimeout(() => {
          closeDetailView(window.currentRenderer);
        }, 50);
      }
    });
  }
}

/**
 * Show brief instructions on how to zoom in to see details
 */
function showZoomInstructions() {
  const instructionsDiv = document.createElement('div');
  instructionsDiv.className = 'zoom-instructions';
  instructionsDiv.innerHTML = `
    <div class="instruction-content">
      <div class="instruction-icon">🔍</div>
      <div class="instruction-text">Use the mouse wheel to zoom in for extremely detailed view</div>
    </div>
  `;
  
  // Style the instructions
  const style = document.createElement('style');
  style.textContent = `
    .zoom-instructions {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      z-index: 1000;
      animation: fadeInOut 4s forwards;
    }
    
    .instruction-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .instruction-icon {
      font-size: 24px;
    }
    
    .instruction-text {
      font-size: 14px;
    }
    
    @keyframes fadeInOut {
      0% { opacity: 0; }
      15% { opacity: 1; }
      85% { opacity: 1; }
      100% { opacity: 0; display: none; }
    }
  `;
  
  document.head.appendChild(style);
  document.getElementById('detailView').appendChild(instructionsDiv);
  
  // Remove after animation completes
  setTimeout(() => {
    if (instructionsDiv.parentNode) {
      instructionsDiv.parentNode.removeChild(instructionsDiv);
    }
  }, 4000);
}

/**
 * Helper function to dispose of Three.js objects and free memory
 * @param {THREE.Scene} scene - The scene to clean up
 */
function disposeMeshesInScene(scene) {
  if (!scene) return;
  
  scene.traverse(object => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => {
          if (material.map) material.map.dispose();
          if (material.lightMap) material.lightMap.dispose();
          if (material.bumpMap) material.bumpMap.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.specularMap) material.specularMap.dispose();
          if (material.envMap) material.envMap.dispose();
          material.dispose();
        });
      } else {
        if (object.material.map) object.material.map.dispose();
        if (object.material.lightMap) object.material.lightMap.dispose();
        if (object.material.bumpMap) object.material.bumpMap.dispose();
        if (object.material.normalMap) object.material.normalMap.dispose();
        if (object.material.specularMap) object.material.specularMap.dispose();
        if (object.material.envMap) object.material.envMap.dispose();
        object.material.dispose();
      }
    }
  });
}

// Export functions for use in other files
export {
  showDetailView,
  closeDetailView,
  create3DPainting,
  showContactInfo,
  getImagePath
}; 
