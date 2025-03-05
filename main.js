import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as TWEEN from 'tween';
// Import detail view functions
import { showDetailView, closeDetailView, getImagePath } from './detailView.js';
// Import background functions
import { createSpaceBackground, animateBackground } from './background.js';
// Import gallery data
import { images, titles, artists, paintingDetails, galleryEmail, paintingCount, loadPaintingData } from './galleryData.js';
// Import PointerLockControls for first-person navigation
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
// Import loading manager
import { initLoadingManager, loadingManager } from './loading.js';

// Initialize the loading manager
const galleryLoadingManager = initLoadingManager();

// Log that Three.js was loaded
console.log("THREE.js imported:", !!THREE);

// Use the loading manager with the texture loader
const textureLoader = new THREE.TextureLoader(galleryLoadingManager);

// Audio setup for footsteps
const listener = new THREE.AudioListener();

// Audio tracks for the gallery
const audioTracks = [
  { file: 'sounds/jazz-1.mp3', name: 'Jazz Track 1' },
];
let currentTrackIndex = 0;
let isPlaying = false;
let audioVolume = 0.7;
let audioPlayer;

// Gallery configuration
const galleryRoomWidth = 7.0;   // Width of the room (along x-axis) - reduced from 9.0
const galleryRoomLength = 11.0;  // Length of the room (along z-axis) - reduced from 12.0
const galleryRoomHeight = 23.0;  // Height of the room
const galleryOffsetZ = -1.0;    // Offset toward the paintings - adjusted to bring walls closer

// Play footstep sound if moving and enough time has passed
function playFootstepIfMoving(deltaTime, isMoving) {
  // Footstep sound playing removed
  return;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Create a space background with the scene parameter
createSpaceBackground(scene);

// Camera positioned in front of the first painting
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0); // Position camera at the center of the gallery
camera.add(listener); // Add audio listener to camera

// First-person mode flag and control variables - always in first-person mode now
let isFirstPersonMode = true;
let controls = null;
// Expose controls to window object for access from other modules
window.controls = controls;
// Movement variables
let canMove = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const walkSpeed = 10.0; // Normal walking speed
const runSpeed = 17.0; // Faster running speed
let currentSpeed = walkSpeed; // Start with walking speed
// Walking bob effect variables
let bobTimer = 0;
let bobHeight = 0;
const bobFrequency = 10; // Slightly slower bobbing for more natural walk
const bobAmplitude = 0.05; // Slightly less high bobbing
let isMoving = false;
// Breathing effect variables
let breathingTimer = 0;
const breathingFrequency = 1.5; // Slow breathing rate
const breathingAmplitude = 0.02; // Subtle breathing movement

// Initialize variables for corner lines
let cornerLines = new THREE.Group();
let cornerLineMaterials = [];

// Create navigation UI that works in first-person mode
function createNavigationControls() {
  // Create container for the controls
  const controlsContainer = document.createElement('div');
  controlsContainer.style.position = 'fixed';
  controlsContainer.style.bottom = '80px';
  controlsContainer.style.left = '50%';
  controlsContainer.style.transform = 'translateX(-50%)';
  controlsContainer.style.display = 'flex';
  controlsContainer.style.gap = '20px';
  controlsContainer.style.zIndex = '1000';
  
  // Create left button
  const leftButton = document.createElement('button');
  leftButton.innerHTML = '&larr;';
  leftButton.style.fontSize = '24px';
  leftButton.style.padding = '10px 20px';
  leftButton.style.background = 'rgba(0, 0, 0, 0.5)';
  leftButton.style.color = 'white';
  leftButton.style.border = '1px solid white';
  leftButton.style.borderRadius = '5px';
  leftButton.style.cursor = 'pointer';
  
  // Create right button
  const rightButton = document.createElement('button');
  rightButton.innerHTML = '&rarr;';
  rightButton.style.fontSize = '24px';
  rightButton.style.padding = '10px 20px';
  rightButton.style.background = 'rgba(0, 0, 0, 0.5)';
  rightButton.style.color = 'white';
  rightButton.style.border = '1px solid white';
  rightButton.style.borderRadius = '5px';
  rightButton.style.cursor = 'pointer';
  
  // Add event listenersw
  leftButton.addEventListener('click', () => {
    const normalizedRotation = (root.rotation.y % (Math.PI * 2));
    const currentIndex = Math.round((-normalizedRotation / (Math.PI * 2)) * paintingCount + paintingCount) % paintingCount;
    rotateGallery(currentIndex, -1);
  });
  
  rightButton.addEventListener('click', () => {
    const normalizedRotation = (root.rotation.y % (Math.PI * 2));
    const currentIndex = Math.round((-normalizedRotation / (Math.PI * 2)) * paintingCount + paintingCount) % paintingCount;
    rotateGallery(currentIndex, 1);
  });
  
  // Add buttons to container
  controlsContainer.appendChild(leftButton);
  controlsContainer.appendChild(rightButton);
  
  // Add container to document
  document.body.appendChild(controlsContainer);
}

// Initialize PointerLockControls
function initFirstPersonControls() {
  if (controls) return; // Already initialized
  
  controls = new PointerLockControls(camera, document.body);
  window.controls = controls; // Update global reference
  
  // Setup event listeners for the controls
  controls.addEventListener('lock', () => {
    canMove = true;
    document.body.style.cursor = 'none';
    bobTimer = 0; // Reset bob timer when entering first-person mode
  });
  
  controls.addEventListener('unlock', () => {
    canMove = false;
    document.body.style.cursor = 'default';
  });
  
  // Auto-enter first-person mode after a short delay
  setTimeout(() => {
    controls.lock();
  }, 1000);
}

// Helper function to lock controls and enter first-person mode
function enterFirstPersonMode() {
  if (controls && !document.pointerLockElement) {
    controls.lock();
  }
}

// Create invisible room boundaries for the entire gallery space
const roomBoundaries = new THREE.Group();
scene.add(roomBoundaries);
scene.add(cornerLines);

// Create invisible walls to keep the user within bounds
function createInvisibleRoom() {
  // Clear any existing boundaries
  while(roomBoundaries.children.length > 0) {
    roomBoundaries.remove(roomBoundaries.children[0]);
  }
  
  // Clear any existing corner lines
  while(cornerLines.children.length > 0) {
    cornerLines.remove(cornerLines.children[0]);
  }
  cornerLineMaterials = [];
  
  // Create invisible boundary materials
  const wallMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(galleryRoomWidth, galleryRoomLength);
  const floor = new THREE.Mesh(floorGeometry, wallMaterial);
  floor.position.set(0, -1, galleryOffsetZ);
  floor.rotation.x = -Math.PI / 2;
  roomBoundaries.add(floor);
  
  // Ceiling
  const ceiling = new THREE.Mesh(floorGeometry, wallMaterial);
  ceiling.position.set(0, galleryRoomHeight - 1, galleryOffsetZ);
  ceiling.rotation.x = Math.PI / 2;
  roomBoundaries.add(ceiling);
  
  // Add visible glowing corner lines for the rectangular room
  createGlowingCornerLines(galleryRoomWidth, galleryRoomLength, galleryOffsetZ);
}

// Create glowing corner lines for the rectangular room
function createGlowingCornerLines(width, length, offsetZ) {
  const cornerThickness = 0.02; // Thickness of the corner lines
  const cornerPositions = []; // Store positions for connecting lines
  const halfWidth = width / 2;
  const halfLength = length / 2;
  
  // Define the 8 corners of the rectangular room
  const corners = [
    // Bottom corners
    new THREE.Vector3(-halfWidth, -1, -halfLength + offsetZ),
    new THREE.Vector3(halfWidth, -1, -halfLength + offsetZ),
    new THREE.Vector3(halfWidth, -1, halfLength + offsetZ),
    new THREE.Vector3(-halfWidth, -1, halfLength + offsetZ),
    // Top corners
    new THREE.Vector3(-halfWidth, 3, -halfLength + offsetZ),
    new THREE.Vector3(halfWidth, 3, -halfLength + offsetZ),
    new THREE.Vector3(halfWidth, 3, halfLength + offsetZ),
    new THREE.Vector3(-halfWidth, 3, halfLength + offsetZ)
  ];
  
  // Create vertical corner posts at each corner
  for (let i = 0; i < 4; i++) {
    const bottom = corners[i];
    cornerPositions.push(bottom);
    
    // Create an "infinite" vertical glowing line using custom shader
    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0088ff) }, // Deeper blue
        color2: { value: new THREE.Color(0x00ffff) }, // Cyan
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          // Moving glow effect from bottom to top
          float flowSpeed = 1.5; // Speed of the flowing glow
          float waveFrequency = 2.0; // Higher values create more "waves" of glow
          float waveWidth = 0.2; // Width of each glowing wave (smaller = narrower)
          
          // Create flowing wave effect moving upward
          float wave = fract((vUv.y + time * flowSpeed) * waveFrequency);
          
          // Smooth step to create a defined glow band that moves upward
          float glow = smoothstep(0.0, waveWidth, wave) * smoothstep(waveWidth * 2.0, waveWidth, wave);
          
          // Add a subtle base glow
          float baseGlow = abs(sin(vUv.y * 5.0 + time * 0.5)) * 0.3;
          
          // Combine the flowing glow with the base glow
          float finalGlow = max(glow * 0.8, baseGlow);
          
          // Create "infinite" effect by fading out at extremes
          float fadeOut = pow(1.0 - abs(vUv.y * 2.0 - 1.0), 0.8);
          
          // Pulse the color slightly for more energy
          vec3 pulsingColor = mix(color1, color2, sin(time) * 0.5 + 0.5);
          
          // Final color
          vec3 color = mix(color2, pulsingColor, finalGlow);
          gl_FragColor = vec4(color, (0.5 + finalGlow * 0.5) * fadeOut);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    cornerLineMaterials.push(lineMaterial);
    
    // Create a taller line for "infinite" effect
    const lineGeometry = new THREE.BoxGeometry(cornerThickness, 30, cornerThickness);
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(bottom.x, 10, bottom.z);
    cornerLines.add(line);
  }
  
  // Create horizontal lines connecting corners
  // Bottom rectangle
  createHorizontalLine(corners[0], corners[1], cornerThickness);
  createHorizontalLine(corners[1], corners[2], cornerThickness);
  createHorizontalLine(corners[2], corners[3], cornerThickness);
  createHorizontalLine(corners[3], corners[0], cornerThickness);
  
  // Top rectangle
  createHorizontalLine(corners[4], corners[5], cornerThickness);
  createHorizontalLine(corners[5], corners[6], cornerThickness);
  createHorizontalLine(corners[6], corners[7], cornerThickness);
  createHorizontalLine(corners[7], corners[4], cornerThickness);
  
  // Vertical lines connecting top and bottom
  createVerticalLine(corners[0], corners[4], cornerThickness);
  createVerticalLine(corners[1], corners[5], cornerThickness);
  createVerticalLine(corners[2], corners[6], cornerThickness);
  createVerticalLine(corners[3], corners[7], cornerThickness);
}

// Helper function to create a horizontal glowing line
function createHorizontalLine(start, end, thickness) {
  const distance = start.distanceTo(end);
  
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xffffff) },
      color2: { value: new THREE.Color(0x00ffff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      
      void main() {
        float gradient = abs(sin(vUv.x * 10.0 + time));
        vec3 color = mix(color1, color2, gradient);
        gl_FragColor = vec4(color, 0.5);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  cornerLineMaterials.push(lineMaterial);
  
  const lineGeometry = new THREE.BoxGeometry(distance, thickness, thickness);
  const line = new THREE.Mesh(lineGeometry, lineMaterial);
  
  // Position in the middle between start and end
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  line.position.copy(midpoint);
  
  // Rotate to align with the direction
  line.lookAt(end);
  line.rotateY(Math.PI / 2);
  
  cornerLines.add(line);
}

// Helper function to create a vertical glowing line
function createVerticalLine(start, end, thickness) {
  const distance = start.distanceTo(end);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x0088ff) }, // Deeper blue
      color2: { value: new THREE.Color(0x00ffff) }, // Cyan
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      
      void main() {
        // Moving glow effect from bottom to top
        float flowSpeed = 1.5; // Speed of the flowing glow
        float waveFrequency = 2.0; // Higher values create more "waves" of glow
        float waveWidth = 0.2; // Width of each glowing wave (smaller = narrower)
        
        // Create flowing wave effect moving upward
        float wave = fract((vUv.y + time * flowSpeed) * waveFrequency);
        
        // Smooth step to create a defined glow band that moves upward
        float glow = smoothstep(0.0, waveWidth, wave) * smoothstep(waveWidth * 2.0, waveWidth, wave);
        
        // Add a subtle base glow
        float baseGlow = abs(sin(vUv.y * 5.0 + time * 0.5)) * 0.3;
        
        // Combine the flowing glow with the base glow
        float finalGlow = max(glow * 0.8, baseGlow);
        
        // Pulse the color slightly for more energy
        vec3 pulsingColor = mix(color1, color2, sin(time) * 0.5 + 0.5);
        
        // Final color
        vec3 color = mix(color2, pulsingColor, finalGlow);
        gl_FragColor = vec4(color, 0.5 + finalGlow * 0.5);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  cornerLineMaterials.push(lineMaterial);
  
  const lineGeometry = new THREE.BoxGeometry(thickness, distance, thickness);
  const line = new THREE.Mesh(lineGeometry, lineMaterial);
  
  // Position in the middle between start and end
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  line.position.copy(midpoint);
  
  cornerLines.add(line);
}

// Add function to update the corner line animations with more variety
function updateCornerLineAnimations(time) {
  let index = 0;
  cornerLineMaterials.forEach(material => {
    if (material.uniforms && material.uniforms.time) {
      // Add slight phase difference to each material for a more dynamic effect
      // Slower time multiplier for smoother upward flow
      material.uniforms.time.value = time * 0.3 + (index * 0.25);
      
      // Alternate the direction and speed slightly for increased visual interest
      if (index % 2 === 1) {
        material.uniforms.time.value = time * 0.35 + (index * 0.15);
      }
      
      index++;
    }
  });
}

// Create the invisible room with glowing corners
createInvisibleRoom();

// Movement keys state
const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ShiftLeft: false  // Added for sprint functionality
};

// Add key down/up event listeners for movement
document.addEventListener('keydown', (event) => {
  // If a movement key is pressed but we're not in first-person mode, enter it
  if (keys.hasOwnProperty(event.code) && !document.pointerLockElement) {
    enterFirstPersonMode();
    return; // Wait for lock to complete before processing the key
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

// Collision detection for the rectangular gallery with offset
function checkCollision(position) {
  const halfWidth = galleryRoomWidth / 2 - 0.5;   // Slight buffer to avoid wall collisions
  const halfLength = galleryRoomLength / 2 - 0.5; // Slight buffer to avoid wall collisions
  const paintingRadius = 6;                       // Radius at which paintings are placed
  const paintingThickness = 0.5;                  // Increased thickness for better collision buffer
  const sectorWidth = 0.6;                        // More accurate sector width in radians

  // **Step 1: Initial Room Boundary Clamping**
  // Clamp position within the rectangular room boundaries
  position.x = Math.max(-halfWidth, Math.min(halfWidth, position.x));
  position.z = Math.max(-halfLength + galleryOffsetZ, Math.min(halfLength + galleryOffsetZ, position.z));
  
  // Ensure y-position stays within reasonable bounds (floor and ceiling)
  position.y = Math.max(-0.5, Math.min(2.5, position.y));
  
  // **Step 2: Painting Collision Detection**
  if (root) {
    // Calculate distance from the center (origin at 0, 0, 0)
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    
    // Check if player is near the painting circle radius
    if (Math.abs(distanceFromCenter - paintingRadius) < paintingThickness) {
      // Calculate the player's angle in radians
      let angle = Math.atan2(position.z, position.x);
      // Normalize angle to 0-2π range
      if (angle < 0) angle += 2 * Math.PI;
      
      // Check each painting's angular sector
      for (let i = 0; i < paintingCount; i++) {
        const paintingAngle = 2 * Math.PI * (i / paintingCount);
        
        // Calculate angular difference, taking the shorter arc
        let angleDiff = Math.abs(angle - paintingAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // If player is within the painting's sector
        if (angleDiff < sectorWidth / 2) {
          // Prevent player from getting too close to the painting
          if (distanceFromCenter < paintingRadius - paintingThickness) {
            // Push player outward to minimum distance
            const pushDistance = paintingRadius - paintingThickness;
            const pushDirection = new THREE.Vector3(position.x, 0, position.z).normalize();
            position.x = pushDirection.x * pushDistance;
            position.z = pushDirection.z * pushDistance;
          }
          break; // Exit loop after handling collision with one painting
        }
      }
    }
  }
  
  // **Step 3: Additional Safety Check**
  // Prevent getting too close to the painting wall
  position.z = Math.max(position.z, -5.8);
  
  // **Step 4: Final Room Boundary Clamping**
  // Ensure final position respects room boundaries
  position.x = Math.max(-halfWidth, Math.min(halfWidth, position.x));
  position.z = Math.max(-halfLength + galleryOffsetZ, Math.min(halfLength + galleryOffsetZ, position.z));
  
  return position;
}

// Global variable for the root object that holds all paintings
let root;

function handleMovement(delta) {
  if (canMove && controls) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    // Update speed based on shift key (sprint when shift is pressed)
    currentSpeed = keys.ShiftLeft ? runSpeed : walkSpeed;
    
    direction.z = Number(keys.KeyW) - Number(keys.KeyS);
    direction.x = Number(keys.KeyD) - Number(keys.KeyA);
    direction.normalize();
    
    if (keys.KeyW || keys.KeyS) velocity.z -= direction.z * currentSpeed * delta;
    if (keys.KeyA || keys.KeyD) velocity.x -= direction.x * currentSpeed * delta;
    
    // Check if the user is moving - use a higher threshold to ensure it detects stops
    const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    isMoving = velocityMagnitude > 0.05; // Increased threshold
    
    // Force isMoving to false if no keys are pressed
    if (!keys.KeyW && !keys.KeyS && !keys.KeyA && !keys.KeyD) {
      isMoving = false;
    }
    
    console.log("Is moving:", isMoving, "Velocity:", velocityMagnitude);
    
    if (isMoving) {
      // Apply walking/running bob effect
      const runningMultiplier = keys.ShiftLeft ? 1.5 : 1.0; // Increase bob frequency and amplitude when running
      bobTimer += delta * bobFrequency * runningMultiplier;
      bobHeight = Math.sin(bobTimer) * bobAmplitude * runningMultiplier;
      // Apply the bob to the camera
      controls.getObject().position.y = bobHeight;
    } else {
      // Apply breathing effect when standing still
      breathingTimer += delta * breathingFrequency;
      const breathHeight = Math.sin(breathingTimer) * breathingAmplitude;
      controls.getObject().position.y = breathHeight;
    }
    
    // Always call playFootstepIfMoving to ensure sound stops when not moving
    playFootstepIfMoving(delta, isMoving);
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Apply collision detection
    checkCollision(controls.getObject().position);
  }
}

const spotlight = new THREE.SpotLight(0xffffff, 100.0, 10, 0.65, 1);
spotlight.position.set(0, 5, 0);
spotlight.target.position.set(0, 1, -5);
scene.add(spotlight);
scene.add(spotlight.target);

const mirror = new Reflector(
  new THREE.CircleGeometry(40, 64),
  {
    color: 0x505050,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
  }
);

mirror.position.set(0, -1.1, 0);
mirror.rotateX(-Math.PI / 2);
scene.add(mirror);

// Store the time of the last frame for movement calculations
let prevTime = performance.now();

function animate() {
  // Calculate delta time for smooth movement
  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;
  
  // Handle movement in first-person mode
  if (isFirstPersonMode) {
    handleMovement(delta);
  }
  
  // Animate background elements
  animateBackground(scene);
  
  // Animate corner lines
  updateCornerLineAnimations(time * 0.001);
  
  // Original animation code
  TWEEN.update();
  renderer.render(scene, camera);
}

function rotateGallery(index, direction) {
  const newRotationY = root.rotation.y + (direction * 2 * Math.PI) / paintingCount;

  // Calculate the next index based on the current rotation and direction
  // We need to calculate what the index will be after the rotation
  const normalizedCurrentRotation = (root.rotation.y % (Math.PI * 2));
  const currentIndex = Math.round((-normalizedCurrentRotation / (Math.PI * 2)) * paintingCount + paintingCount) % paintingCount;
  const nextIndex = direction === 1 ? 
                    (currentIndex - 1 + paintingCount) % paintingCount : 
                    (currentIndex + 1) % paintingCount;
  
  console.log("Rotating from index", currentIndex, "to", nextIndex, "Direction:", direction);

  const titleElement = document.getElementById('title');
  const artistElement = document.getElementById('artist');

  new TWEEN.Tween(root.rotation)
    .to({ y: newRotationY }, 1500)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start()
    .onStart(() => {
      titleElement.style.opacity = 0;
      artistElement.style.opacity = 0;
      
      // Hide detail view if it's open
      const detailView = document.getElementById('detailView');
      if (detailView && detailView.style.display === 'flex') {
        closeDetailView(renderer);
      }
    })
    .onComplete(() => {
      titleElement.innerText = titles[nextIndex];
      artistElement.innerText = artists[nextIndex];
      titleElement.style.opacity = 1;
      artistElement.style.opacity = 1;
    });
}

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
  // Only handle clicks when not in pointer lock mode
  if (document.pointerLockElement) return;
  
  const mouse = new THREE.Vector2();
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(root.children, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    
    // Calculate the current index based on rotation
    const normalizedRotation = (root.rotation.y % (Math.PI * 2));
    const currentIndex = Math.round((-normalizedRotation / (Math.PI * 2)) * paintingCount + paintingCount) % paintingCount;
    
    console.log("Clicked object:", clickedObject.name, "Current index:", currentIndex);

    if (clickedObject.name === 'left' || clickedObject.name === 'right') {
      const direction = clickedObject.name === 'left' ? -1 : 1;
      rotateGallery(currentIndex, direction);
    } else if (clickedObject.name === 'artwork') {
      // Show detail view when clicking on a painting
      showDetailView(currentIndex, images, titles, artists, paintingDetails, renderer);
    } else {
      // Clicked on something else in the environment, enter first-person mode
      enterFirstPersonMode();
    }
  } else {
    // Clicked on nothing (empty space), still enter first-person mode
    enterFirstPersonMode();
  }
});

// Modified key press handler for first-person navigation and gallery control
function handleKeyPress(event) {
  // If in a detail view, handle Escape to exit
  if (event.key === 'Escape') {
    // Close detail view when pressing Escape
    const detailView = document.getElementById('detailView');
    if (detailView && detailView.style.display === 'flex') {
      closeDetailView(renderer);
      
      // Also ensure contactInfo is closed
      const contactInfo = document.getElementById('contactInfo');
      if (contactInfo) {
        contactInfo.style.display = 'none';
      }
      
      // Restore first-person controls
      if (controls && !document.pointerLockElement) {
        controls.lock();
      }
      
      // Force a clean repaint of the scene to fix any visual artifacts
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
      });
      
      return;
    }
    
    // Also close contact info if open
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
      contactInfo.style.display = 'none';
      
      // Force a clean repaint of the scene to fix any visual artifacts
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
      });
    }
  }
  
  // Add space bar control for audio play/pause 
  // Only when not typing in an input field and no modal is open
  if (event.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    // Don't trigger space control if in detail view
    const detailView = document.getElementById('detailView');
    const contactInfo = document.getElementById('contactInfo');
    
    if ((!detailView || detailView.style.display !== 'flex') && 
        (!contactInfo || contactInfo.style.display !== 'flex')) {
      // Prevent default space bar behavior (page scroll)
      event.preventDefault();
      togglePlayPause();
    }
    return;
  }
  
  if (!window.mainGalleryKeyEnabled) {
    console.log("Key events disabled while detail view is open");
    return;
  }

  // Calculate the current painting index based on rotation
  // Ensure the result is always a positive index within bounds
  const normalizedRotation = (root.rotation.y % (Math.PI * 2));
  const currentIndex = Math.round((-normalizedRotation / (Math.PI * 2)) * paintingCount + paintingCount) % paintingCount;
  
  console.log("Current index:", currentIndex, "Rotation:", root.rotation.y);

  if (event.key === 'Enter') {
    // Show detail view for the current painting
    showDetailView(currentIndex, images, titles, artists, paintingDetails, renderer);
  } else if (event.key === 'ArrowLeft') {
    // Calculate the next index (left direction)
    const nextIndex = (currentIndex + 1) % paintingCount;
    
    // Rotate gallery left (objects move right to show painting on the left)
    const targetRotation = root.rotation.y - Math.PI * 2 / paintingCount;
    
    const titleElement = document.getElementById('title');
    const artistElement = document.getElementById('artist');
    
    titleElement.style.opacity = 0;
    artistElement.style.opacity = 0;
    
    new TWEEN.Tween(root.rotation)
      .to({ y: targetRotation }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start()
      .onComplete(() => {
        // Update title and artist text
        titleElement.innerText = titles[nextIndex];
        artistElement.innerText = artists[nextIndex];
        titleElement.style.opacity = 1;
        artistElement.style.opacity = 1;
      });
  } else if (event.key === 'ArrowRight') {
    // Calculate the next index (right direction)
    const nextIndex = (currentIndex - 1 + paintingCount) % paintingCount;
    
    // Rotate gallery right (objects move left to show painting on the right)
    const targetRotation = root.rotation.y + Math.PI * 2 / paintingCount;
    
    const titleElement = document.getElementById('title');
    const artistElement = document.getElementById('artist');
    
    titleElement.style.opacity = 0;
    artistElement.style.opacity = 0;
    
    new TWEEN.Tween(root.rotation)
      .to({ y: targetRotation }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start()
      .onComplete(() => {
        // Update title and artist text
        titleElement.innerText = titles[nextIndex];
        artistElement.innerText = artists[nextIndex];
        titleElement.style.opacity = 1;
        artistElement.style.opacity = 1;
      });
  }
}

// Add mouse move event to highlight interactive elements
window.addEventListener('mousemove', (ev) => {
  // Skip if in pointer lock mode
  if (document.pointerLockElement) return;
  
  const mouse = new THREE.Vector2();
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with all interactive objects
  const intersects = raycaster.intersectObjects(root.children, true);
  
  // Highlight the hovered button
  if (intersects.length > 0) {
    const hoveredObject = intersects[0].object;
    
    if (hoveredObject.name === 'left' || hoveredObject.name === 'right' || hoveredObject.name === 'artwork') {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  } else {
    document.body.style.cursor = 'default';
  }
});

// Add keyboard navigation
window.addEventListener('keydown', handleKeyPress);

// Initialize the main gallery key enabled flag to true
window.mainGalleryKeyEnabled = true;

// Load painting data from CSV
async function initializeGallery() {
  try {
    // Load painting data from CSV
    await loadPaintingData();
    
    // Create the paintings in the gallery now that we have the data
    createGalleryPaintings();
    
    // Set initial title and artist info
    document.getElementById('title').innerText = titles[0];
    document.getElementById('artist').innerText = artists[0];
    
    // Add enhanced instructions for first-person mode
    const instructionsElement = document.getElementById('instructions');
    if (instructionsElement) {
      instructionsElement.innerHTML = 'Use WASD to move and mouse to look around.<br>Hold SHIFT to run faster.<br>Press ESC to unlock mouse cursor, click or press WASD to re-enter first-person mode.<br>Use arrow keys or click arrows to change paintings.<br>Click on a painting or press Enter to view details.<br>Press SPACE to play/pause music.';
      
      // Apply styles to position instructions at bottom left
      instructionsElement.style.textAlign = 'left';
      instructionsElement.style.left = '20px';
      instructionsElement.style.width = 'auto';
      instructionsElement.style.maxWidth = '500px';
      instructionsElement.style.padding = '10px';
      instructionsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      instructionsElement.style.borderRadius = '5px';
    }
    
    // Initialize first-person controls and navigation UI
    initFirstPersonControls();
    createNavigationControls();
    createAudioPlayer();
  } catch (error) {
    console.error("Failed to initialize gallery:", error);
  }
}

// Function to create the gallery paintings
function createGalleryPaintings() {
  console.log("Creating gallery paintings:", images);
  
  // Create a root object to hold all paintings
  root = new THREE.Object3D();
  scene.add(root);
  
  for (let i = 0; i < paintingCount; i++) {
    console.log(`Creating painting ${i}: ${images[i]}`);
    
    // Create base node first so we can reference it in the callback
    const baseNode = new THREE.Object3D();
    baseNode.name = `painting-${i}`;  // Give the node a unique name
    baseNode.rotation.y = 2 * Math.PI * (i / paintingCount);
    
    const image = textureLoader.load(getImagePath(images[i]), (texture) => {
      // Get the original aspect ratio of the loaded texture
      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const aspectRatio = imgWidth / imgHeight;
      
      // Update the painting geometry to match the original aspect ratio
      // Keep the height at 2 and adjust width accordingly
      const paintingHeight = 2.0;
      const paintingWidth = paintingHeight * aspectRatio;
      
      // Find the node we created earlier by name
      const node = root.getObjectByName(`painting-${i}`);
      if (node) {
        // Update the artwork mesh geometry
        const artwork = node.getObjectByName('artwork');
        if (artwork) {
          artwork.geometry.dispose();
          artwork.geometry = new THREE.BoxGeometry(paintingWidth, paintingHeight, 0.01);
          
          // Also update the border to maintain margin around the painting
          const border = node.children[0]; // First child is the border
          border.geometry.dispose();
          border.geometry = new THREE.BoxGeometry(paintingWidth + 0.2, paintingHeight + 0.2, 0.005);
          
          // Update arrow positions based on new width
          const leftArrow = node.getObjectByName('left');
          const rightArrow = node.getObjectByName('right');
          
          if (leftArrow) leftArrow.position.set(paintingWidth/2 + 0.4, 0, -6);
          if (rightArrow) rightArrow.position.set(-paintingWidth/2 - 0.4, 0, -6);
        }
      }
    });

    // Create with default 3:2 aspect ratio initially, will be updated when texture loads
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x303030 })
    );
    border.position.z = -6;
    baseNode.add(border);

    const artwork = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 0.01),
      new THREE.MeshStandardMaterial({ map: image })
    );
    artwork.position.z = -6;
    artwork.name = 'artwork';
    artwork.userData = i; // Store the painting index for reference
    baseNode.add(artwork);


    root.add(baseNode);
  }
}

// Start the initialization
initializeGallery();

// Function to create and setup the audio player
function createAudioPlayer() {
  // Add listener to camera if not already there
  if (!camera.children.includes(listener)) {
    camera.add(listener);
  }
  
  // Create audio object for background music
  audioPlayer = new THREE.Audio(listener);
  
  // Load the first track
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(audioTracks[currentTrackIndex].file, function(buffer) {
    audioPlayer.setBuffer(buffer);
    audioPlayer.setLoop(true);
    audioPlayer.setVolume(audioVolume);
    // Automatically play when loaded (optional)
    // audioPlayer.play();
    // isPlaying = true;
    updateNowPlayingText();
  });
  
  // Create HTML UI for audio controls in bottom right corner
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
  
  // Create now playing text
  const nowPlayingDiv = document.createElement('div');
  nowPlayingDiv.id = 'nowPlaying';
  nowPlayingDiv.style.fontSize = '0.8em';
  nowPlayingDiv.style.marginTop = '5px';
  nowPlayingDiv.style.textAlign = 'center';
  
  // Only append the now playing text, removing all buttons
  audioControlsDiv.appendChild(nowPlayingDiv);
  
  document.body.appendChild(audioControlsDiv);
  
  // Call updateNowPlayingText initially
  updateNowPlayingText();
}

// Function to toggle play/pause
function togglePlayPause() {
  if (!audioPlayer || !audioPlayer.buffer) return;
  
  if (isPlaying) {
    audioPlayer.pause();
  } else {
    audioPlayer.play();
  }
  
  isPlaying = !isPlaying;
  
  // Update now playing text to show current status
  updateNowPlayingText();
}