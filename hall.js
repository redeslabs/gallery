import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as TWEEN from 'tween';
import { showDetailView, closeDetailView, getImagePath } from './detailView.js';
import { createSpaceBackground, animateBackground } from './background.js';
import { images, titles, artists, paintingDetails, galleryEmail, paintingCount, loadPaintingData } from './galleryData.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { initLoadingManager, loadingManager } from './loading.js';

// Initialize the loading manager
const galleryLoadingManager = initLoadingManager();

// Texture loader with loading manager
const textureLoader = new THREE.TextureLoader(galleryLoadingManager);

// Audio setup for footsteps
const listener = new THREE.AudioListener();

// Audio tracks for the gallery
const audioTracks = [
  { file: 'sounds/jazz-1.mp3', name: 'Jazz Track 1' },
];
let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;
let audioVolume = 0.7;
let audioPlayer;

// Gallery configuration
const galleryRoomWidth = 6.0;    // Narrow hallway width
const galleryRoomLength = 200.0; // Long hallway length
const galleryRoomHeight = 4.0;   // Reduced height
const galleryOffsetZ = 0.0;      // Center the hallway at z=0

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Scene setup
const scene = new THREE.Scene();
createSpaceBackground(scene);

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); // Start at eye level in the hallway
camera.rotation.y = Math.PI; // Start facing the opposite direction (180 degrees rotation)
camera.add(listener);

// First-person mode flag and controls
let isFirstPersonMode = true;
let controls = null;
window.controls = controls;
let canMove = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const walkSpeed = 10.0;
const runSpeed = 17.0;
let currentSpeed = walkSpeed;
let bobTimer = 0;
let bobHeight = 0;
const bobFrequency = 10;
const bobAmplitude = 0.05;
let isMoving = false;
let breathingTimer = 0;
const breathingFrequency = 1.5;
const breathingAmplitude = 0.02;

// Movement keys state
const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ShiftLeft: false
};

// Initialize PointerLockControls
function initFirstPersonControls() {
  if (controls) return;
  controls = new PointerLockControls(camera, document.body);
  window.controls = controls;
  controls.addEventListener('lock', () => {
    canMove = true;
    document.body.style.cursor = 'none';
    bobTimer = 0;
  });
  controls.addEventListener('unlock', () => {
    canMove = false;
    document.body.style.cursor = 'default';
  });
  setTimeout(() => {
    controls.lock();
  }, 1000);
}

// Enter first-person mode
function enterFirstPersonMode() {
  if (controls && !document.pointerLockElement) {
    controls.lock();
  }
}

// Handle key down/up for movement
document.addEventListener('keydown', (event) => {
  if (keys.hasOwnProperty(event.code) && !document.pointerLockElement) {
    enterFirstPersonMode();
    return;
  }
  if (canMove && keys.hasOwnProperty(event.code)) {
    keys[event.code] = true;
  }
});

document.addEventListener('keyup', (event) => {
  if (keys.hasOwnProperty(event.code)) {
    keys[event.code] = false;
  }
});

// Collision detection for the hallway
function checkCollision(position) {
  const minX = -2.5;
  const maxX = 2.5;
  const minY = -0.5;
  const maxY = 2.5;
  const minZ = -5;
  const maxZ = (paintingCount - 1) * 2 + 5;
  position.x = Math.max(minX, Math.min(maxX, position.x));
  position.y = Math.max(minY, Math.min(maxY, position.y));
  position.z = Math.max(minZ, Math.min(maxZ, position.z));
  return position;
}

// Handle movement in first-person mode
function handleMovement(delta) {
  if (canMove && controls) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    currentSpeed = keys.ShiftLeft ? runSpeed : walkSpeed;
    direction.z = Number(keys.KeyW) - Number(keys.KeyS);
    direction.x = Number(keys.KeyD) - Number(keys.KeyA);
    direction.normalize();
    if (keys.KeyW || keys.KeyS) velocity.z -= direction.z * currentSpeed * delta;
    if (keys.KeyA || keys.KeyD) velocity.x -= direction.x * currentSpeed * delta;
    const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    isMoving = velocityMagnitude > 0.05;
    if (!keys.KeyW && !keys.KeyS && !keys.KeyA && !keys.KeyD) {
      isMoving = false;
    }
    if (isMoving) {
      const runningMultiplier = keys.ShiftLeft ? 1.5 : 1.0;
      bobTimer += delta * bobFrequency * runningMultiplier;
      bobHeight = Math.sin(bobTimer) * bobAmplitude * runningMultiplier;
      controls.getObject().position.y = bobHeight;
    } else {
      breathingTimer += delta * breathingFrequency;
      const breathHeight = Math.sin(breathingTimer) * breathingAmplitude;
      controls.getObject().position.y = breathHeight;
    }
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    checkCollision(controls.getObject().position);
  }
}

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 0.35); // Slightly dimmer ambient light
scene.add(ambientLight);

// Add a subtle directional light to simulate overall gallery lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Add small point lights at intervals along the hallway for better visibility
for (let z = 0; z < galleryRoomLength; z += 10) {
  const pointLight = new THREE.PointLight(0xffffcc, 0.2, 5);
  pointLight.position.set(0, 2.5, z);
  scene.add(pointLight);
}

// Reflective floor
const mirror = new Reflector(
  new THREE.PlaneGeometry(6, 200),
  {
    color: 0x505050,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
  }
);
mirror.position.set(0, -1.1, 90);
mirror.rotation.x = -Math.PI / 2;
scene.add(mirror);

// Root object for paintings
let root;

// Animation loop
let prevTime = performance.now();
let lightPulseTimer = 0;
let currentFocusedPainting = -1; // Track which painting is currently focused

function animate() {
  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;
  
  // Animate the spotlights with a subtle pulse
  lightPulseTimer += delta * 0.5; // Slow pulsing speed
  const pulseIntensity = 7.5 + Math.sin(lightPulseTimer) * 1.0; // Base intensity 7.5, variation of ±1.0
  
  // Update all spotlight intensities
  if (root) {
    for (let i = 0; i < paintingCount; i++) {
      const spotlight = scene.getObjectByName(`spotlight-${i}`);
      if (spotlight) {
        // Add slightly different phase for each light to create more interesting effect
        const individualPulse = pulseIntensity + Math.sin(lightPulseTimer + i * 0.5) * 0.5;
        spotlight.intensity = individualPulse;
        
        // Find the specific light fixture for this painting
        const fixtures = scene.children.filter(obj => obj.name === `lightFixture-${i}`);
        if (fixtures && fixtures.length > 0) {
          const lightFixture = fixtures[0];
          if (lightFixture && lightFixture.children.length > 1) {
            const bulb = lightFixture.children[1];
            if (bulb && bulb.material) {
              bulb.material.emissiveIntensity = 0.8 + Math.sin(lightPulseTimer + i * 0.5) * 0.2;
            }
          }
        }
        
        // Update the position of the painting label in 3D space
        updatePaintingLabel(i);
      }
    }
  }
  
  // Raycast to detect which painting the user is looking at
  if (isFirstPersonMode && controls && document.pointerLockElement && root) {
    const raycaster = new THREE.Raycaster();
    // Set raycaster from camera (looking straight ahead)
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Check intersections with paintings
    const intersects = raycaster.intersectObjects(root.children, true);
    
    let newFocusedPainting = -1;
    
    // Find the first artwork in the intersections
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      if (obj.name === 'artwork') {
        const paintingIndex = obj.userData;
        
        // Check the distance to the painting
        const paintingPos = new THREE.Vector3();
        obj.getWorldPosition(paintingPos);
        const distanceToPainting = camera.position.distanceTo(paintingPos);
        
        // Only focus if within 4 units of the painting
        if (distanceToPainting <= 4) {
          newFocusedPainting = paintingIndex;
        }
        break;
      }
    }
    
    // If the focused painting has changed, update the display
    if (newFocusedPainting !== currentFocusedPainting) {
      // Update the focus indicator
      const focusIndicator = document.getElementById('focusIndicator');
      if (focusIndicator) {
        if (newFocusedPainting !== -1) {
          // Painting in focus - slightly more visible
          focusIndicator.style.opacity = '0.3';
        } else {
          // No painting in focus - barely visible
          focusIndicator.style.opacity = '0.15';
        }
      }
      
      // Show/hide the detail prompt
      const detailPrompt = document.getElementById('detailPrompt');
      if (detailPrompt) {
        if (newFocusedPainting !== -1) {
          // Show prompt when painting is focused
          detailPrompt.style.opacity = '1';
        } else {
          // Hide prompt when no painting is focused
          detailPrompt.style.opacity = '0';
        }
      }
      
      // Hide label for previously focused painting
      if (currentFocusedPainting !== -1) {
        const oldLabel = document.getElementById(`painting-label-${currentFocusedPainting}`);
        if (oldLabel) {
          oldLabel.style.opacity = '0';
        }
      }
      
      // Update the current focused painting
      currentFocusedPainting = newFocusedPainting;
      
      // Show label for newly focused painting
      if (currentFocusedPainting !== -1) {
        const newLabel = document.getElementById(`painting-label-${currentFocusedPainting}`);
        if (newLabel) {
          newLabel.style.opacity = '1';
        }
      }
      
      // Update title and artist HTML elements (hide since we use labels now)
      const titleElement = document.getElementById('title');
      const artistElement = document.getElementById('artist');
      
      // Always hide HTML elements now that we're using painting labels
      titleElement.style.opacity = 0;
      artistElement.style.opacity = 0;
    }
  }
  
  if (isFirstPersonMode) {
    handleMovement(delta);
  }
  animateBackground(scene);
  TWEEN.update();
  renderer.render(scene, camera);
}

// Function to update the position of a painting's label in screen space
function updatePaintingLabel(index) {
  const labelElement = document.getElementById(`painting-label-${index}`);
  if (!labelElement) return;
  
  const node = root.getObjectByName(`painting-${index}`);
  if (!node) return;
  
  // Use the painting's position for label placement
  const artwork = node.getObjectByName('artwork');
  if (!artwork) return;
  
  // Create a position vector at the bottom center of the painting
  const labelPos = new THREE.Vector3();
  artwork.getWorldPosition(labelPos);
  
  // Check if the artwork has a geometry to get its height
  let paintingHeight = 1.0; // Default height if we can't determine
  if (artwork.geometry) {
    // Try to get the actual height of the painting
    if (artwork.geometry.parameters && artwork.geometry.parameters.height) {
      paintingHeight = artwork.geometry.parameters.height;
    } else if (artwork.geometry.boundingBox) {
      paintingHeight = artwork.geometry.boundingBox.max.y - artwork.geometry.boundingBox.min.y;
    }
  }
  
  // Adjust the position to be at the bottom of the painting, slightly below it
  labelPos.y -= (paintingHeight / 2) + 0.15; // Position below the painting
  
  // Project the 3D position to screen space
  labelPos.project(camera);
  
  // Convert the normalized position to CSS coordinates
  const x = (labelPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(labelPos.y * 0.5) + 0.5) * window.innerHeight;
  
  // Only show labels that are in front of the camera (z < 1)
  if (labelPos.z < 1) {
    // Check if this painting is the focused one
    if (index === currentFocusedPainting) {
      labelElement.style.opacity = '1';
      labelElement.style.left = x + 'px';
      labelElement.style.top = y + 'px';
    } else {
      labelElement.style.opacity = '0';
    }
  } else {
    labelElement.style.opacity = '0';
  }
}

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  mirror.getRenderTarget().setSize(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  );
});

// Click handler for gallery interaction
window.addEventListener('click', (ev) => {
  if (document.pointerLockElement) return;
  const mouse = new THREE.Vector2();
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(root.children, true);
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    if (clickedObject.name === 'artwork') {
      const index = clickedObject.userData;
      showDetailView(index, images, titles, artists, paintingDetails, renderer);
    } else {
      // Check if we have a focused painting when clicking elsewhere
      if (currentFocusedPainting !== -1) {
        // Show detail for the currently focused painting
        showDetailView(currentFocusedPainting, images, titles, artists, paintingDetails, renderer);
      } else {
        enterFirstPersonMode();
      }
    }
  } else {
    // Check if we have a focused painting when clicking on empty space
    if (currentFocusedPainting !== -1) {
      // Show detail for the currently focused painting
      showDetailView(currentFocusedPainting, images, titles, artists, paintingDetails, renderer);
    } else {
      enterFirstPersonMode();
    }
  }
});

// Key press handler
function handleKeyPress(event) {
  if (event.key === 'Escape') {
    const detailView = document.getElementById('detailView');
    if (detailView && detailView.style.display === 'flex') {
      closeDetailView(renderer);
    }
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
      contactInfo.style.display = 'none';
    }
    if (controls && !document.pointerLockElement) {
      controls.lock();
    }
    requestAnimationFrame(() => {
      renderer.render(scene, camera);
    });
    return;
  }
  if (event.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    const detailView = document.getElementById('detailView');
    const contactInfo = document.getElementById('contactInfo');
    if ((!detailView || detailView.style.display !== 'flex') && 
        (!contactInfo || contactInfo.style.display !== 'flex')) {
      event.preventDefault();
      togglePlayPause();
    }
    return;
  }
  if (!window.mainGalleryKeyEnabled) {
    console.log("Key events disabled while detail view is open");
    return;
  }
  if (event.key === 'Enter') {
    // Check if we have a focused painting
    if (currentFocusedPainting !== -1) {
      // Show detail view for the currently focused painting
      showDetailView(currentFocusedPainting, images, titles, artists, paintingDetails, renderer);
    } else {
      // Fallback: find closest painting if no painting is focused
      let closestIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < paintingCount; i++) {
        const zPos = i * 2;
        const distance = Math.abs(camera.position.z - zPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      showDetailView(closestIndex, images, titles, artists, paintingDetails, renderer);
    }
  }
}
window.addEventListener('keydown', handleKeyPress);
window.mainGalleryKeyEnabled = true;

// Initialize gallery
async function initializeGallery() {
  try {
    await loadPaintingData();
    createGalleryPaintings();
    // Initialize with empty title and artist
    document.getElementById('title').innerText = '';
    document.getElementById('artist').innerText = '';
    // Make sure the text is hidden
    document.getElementById('title').style.opacity = 0;
    document.getElementById('artist').style.opacity = 0;
    
    // Create a container for 3D painting labels
    const labelContainer = document.createElement('div');
    labelContainer.id = 'painting-labels';
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '0';
    labelContainer.style.left = '0';
    labelContainer.style.width = '100%';
    labelContainer.style.height = '100%';
    labelContainer.style.pointerEvents = 'none';
    labelContainer.style.overflow = 'hidden';
    document.body.appendChild(labelContainer);
    
    // Create individual label elements for each painting
    for (let i = 0; i < paintingCount; i++) {
      const labelElement = document.createElement('div');
      labelElement.id = `painting-label-${i}`;
      labelElement.className = 'painting-label';
      labelElement.innerHTML = `
        <div class="painting-title">${titles[i]}</div>
        <div class="painting-artist">${artists[i]}</div>
      `;
      labelElement.style.position = 'absolute';
      labelElement.style.padding = '10px 14px';
      labelElement.style.background = 'rgba(0, 0, 0, 0.75)';
      labelElement.style.borderRadius = '6px';
      labelElement.style.color = 'white';
      labelElement.style.textAlign = 'center';
      labelElement.style.transform = 'translateX(-50%)'; // Center horizontally but don't move up
      labelElement.style.opacity = '0';
      labelElement.style.transition = 'opacity 0.3s ease-in-out';
      labelElement.style.pointerEvents = 'none';
      labelElement.style.fontFamily = '"Playfair Display", serif'; // A more elegant font for art gallery
      labelElement.style.zIndex = '1000';
      labelElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      labelElement.style.backdropFilter = 'blur(2px)';
      
      const titleEl = labelElement.querySelector('.painting-title');
      titleEl.style.fontSize = '18px';
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '4px';
      titleEl.style.letterSpacing = '0.5px';
      
      const artistEl = labelElement.querySelector('.painting-artist');
      artistEl.style.fontSize = '15px';
      artistEl.style.color = '#e6e6e6';
      artistEl.style.fontStyle = 'italic';
      
      labelContainer.appendChild(labelElement);
    }
    
    // Create a focus indicator in the center of the screen
    const focusIndicator = document.createElement('div');
    focusIndicator.id = 'focusIndicator';
    focusIndicator.style.position = 'fixed';
    focusIndicator.style.top = '50%';
    focusIndicator.style.left = '50%';
    focusIndicator.style.width = '6px';
    focusIndicator.style.height = '6px';
    focusIndicator.style.borderRadius = '50%';
    focusIndicator.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    focusIndicator.style.transform = 'translate(-50%, -50%)';
    focusIndicator.style.opacity = '0.2';
    focusIndicator.style.pointerEvents = 'none';
    focusIndicator.style.transition = 'opacity 0.2s ease-in-out';
    document.body.appendChild(focusIndicator);
    
   
    
    const instructionsElement = document.getElementById('instructions');
    if (instructionsElement) {
      instructionsElement.innerHTML = 'Use WASD to move and mouse to look around.<br>Hold SHIFT to run faster.<br>Press ESC to unlock mouse cursor, click or hold press WASD to re-enter first-person mode.<br>Use arrow keys or click arrows to change paintings.<br>Click on a painting or press Enter to view details.<br>Press SPACE to play/pause music.';
      instructionsElement.style.textAlign = 'left';
      instructionsElement.style.left = '20px';
      instructionsElement.style.width = 'auto';
      instructionsElement.style.maxWidth = '500px';
      instructionsElement.style.padding = '10px';
      instructionsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      instructionsElement.style.borderRadius = '5px';
    }
    initFirstPersonControls();
    createAudioPlayer();

    // Add Playfair Display font for elegant art gallery feel
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(fontLink);
  } catch (error) {
    console.error("Failed to initialize gallery:", error);
  }
}

// Create gallery paintings
function createGalleryPaintings() {
  console.log("Creating gallery paintings:", images);
  root = new THREE.Object3D();
  scene.add(root);
  const wallDistance = 2;
  const paintingSpacing = 2;
  for (let i = 0; i < paintingCount; i++) {
    console.log(`Creating painting ${i}: ${images[i]}`);
    const baseNode = new THREE.Object3D();
    baseNode.name = `painting-${i}`;
    const zPos = i * paintingSpacing;
    if (i % 2 === 0) {
      baseNode.position.set(-wallDistance, 1.0, zPos);
      baseNode.rotation.y = Math.PI / 2;
    } else {
      baseNode.position.set(wallDistance, 1.0, zPos);
      baseNode.rotation.y = -Math.PI / 2;
    }
    
    // Add spotlight above the painting
    const spotlight = new THREE.SpotLight(0xffffff, 8, 6, Math.PI / 3, 0.7, 1.2);
    spotlight.name = `spotlight-${i}`;
    
    // Enable shadows for this spotlight
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    spotlight.shadow.camera.near = 0.5;
    spotlight.shadow.camera.far = 5;
    spotlight.shadow.focus = 1;
    
    // Create visible light fixture
    const lightFixture = new THREE.Group();
    lightFixture.name = `lightFixture-${i}`;
    
    // Light housing
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    
    // Light bulb (emissive for glow effect)
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0xffffcc, 
        emissive: 0xffffcc,
        emissiveIntensity: 1
      })
    );
    bulb.position.y = -0.05;
    
    // Add parts to fixture
    lightFixture.add(housing);
    lightFixture.add(bulb);
    
    if (i % 2 === 0) {
      // For paintings on the left wall
      spotlight.position.set(-wallDistance + 0.3, 2.7, zPos);
      spotlight.target.position.set(-wallDistance - 0.3, 1.0, zPos);
      lightFixture.position.set(-wallDistance + 0.3, 2.7, zPos);
      lightFixture.rotation.x = Math.PI/2;
      lightFixture.rotation.z = -Math.PI/6; // Tilt fixture slightly toward the painting
    } else {
      // For paintings on the right wall
      spotlight.position.set(wallDistance - 0.3, 2.7, zPos);
      spotlight.target.position.set(wallDistance + 0.3, 1.0, zPos);
      lightFixture.position.set(wallDistance - 0.3, 2.7, zPos);
      lightFixture.rotation.x = Math.PI/2;
      lightFixture.rotation.z = Math.PI/6; // Tilt fixture slightly toward the painting
    }
    
    // Add subtle warm color to the light
    spotlight.color.setHSL(0.08, 0.3, 1.0); // Less saturated, full brightness
    
    scene.add(spotlight);
    scene.add(spotlight.target);
    scene.add(lightFixture);
    
    const image = textureLoader.load(getImagePath(images[i]), (texture) => {
      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const aspectRatio = imgWidth / imgHeight;
      const paintingHeight = 2.0;
      const paintingWidth = paintingHeight * aspectRatio;
      const node = root.getObjectByName(`painting-${i}`);
      if (node) {
        const artwork = node.getObjectByName('artwork');
        if (artwork) {
          artwork.geometry.dispose();
          artwork.geometry = new THREE.BoxGeometry(paintingWidth, paintingHeight, 0.01);
          const border = node.children[0];
          border.geometry.dispose();
          border.geometry = new THREE.BoxGeometry(paintingWidth + 0.2, paintingHeight + 0.2, 0.005);
        }
      }
    });
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 0.005),
      new THREE.MeshStandardMaterial({ 
        color: 0x303030,
        roughness: 0.7,
        metalness: 0.1
      })
    );
    border.receiveShadow = true;
    baseNode.add(border);
    const artwork = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 0.01),
      new THREE.MeshStandardMaterial({ 
        map: image,
        roughness: 0.5,
        metalness: 0.0,
        emissive: 0x111111, // Slight emissive property to ensure it's never completely dark
        emissiveIntensity: 0.1
      })
    );
    artwork.name = 'artwork';
    artwork.userData = i;
    artwork.receiveShadow = true;
    baseNode.add(artwork);
    root.add(baseNode);
  }
}

// Audio player setup
function createAudioPlayer() {
  audioPlayer = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(audioTracks[currentTrackIndex].file, function(buffer) {
    audioPlayer.setBuffer(buffer);
    audioPlayer.setLoop(true);
    audioPlayer.setVolume(audioVolume);
    updateNowPlayingText();
  });
  const audioControlsDiv = document.createElement('div');
  audioControlsDiv.id = 'audioControls';
  audioControlsDiv.style.position = 'fixed';
  audioControlsDiv.style.bottom = '20px';
  audioControlsDiv.style.right = '20px';
  audioControlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  audioControlsDiv.style.padding = '10px';
  audioControlsDiv.style.borderRadius = '5px';
  audioControlsDiv.style.display = 'flex';
  audioControlsDiv.style.flexDirection = 'column';
  audioControlsDiv.style.alignItems = 'center';
  audioControlsDiv.style.zIndex = '1000';
  audioControlsDiv.style.color = 'white';
  audioControlsDiv.style.fontFamily = 'Inter, sans-serif';
  const nowPlayingDiv = document.createElement('div');
  nowPlayingDiv.id = 'nowPlaying';
  nowPlayingDiv.style.fontSize = '0.8em';
  nowPlayingDiv.style.marginTop = '5px';
  nowPlayingDiv.style.textAlign = 'center';
  audioControlsDiv.appendChild(nowPlayingDiv);
  document.body.appendChild(audioControlsDiv);
  updateNowPlayingText();
}

// Toggle play/pause
function togglePlayPause() {
  if (!audioPlayer || !audioPlayer.buffer) return;
  if (isPlaying) {
    audioPlayer.pause();
  } else {
    audioPlayer.play();
  }
  isPlaying = !isPlaying;
  updateNowPlayingText();
}

// Update now playing text
function updateNowPlayingText() {
  const nowPlayingDiv = document.getElementById('nowPlaying');
  if (nowPlayingDiv) {
    const trackName = audioTracks[currentTrackIndex].name;
    const status = isPlaying ? 'Playing' : 'Paused';
    nowPlayingDiv.innerText = `${status}`;
  }
}

// Start initialization
initializeGallery();
