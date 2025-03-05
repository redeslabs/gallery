import * as THREE from 'three';

// Utility to create a simple star texture with a radial gradient
function createStarTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Room boundaries imported from main.js for collision detection
const ROOM_WIDTH = 10.0;   // Width of the gallery room (x-axis)
const ROOM_LENGTH = 10.0;  // Length of the gallery room (z-axis)
const ROOM_HEIGHT = 12.0;  // Height of the gallery room
const ROOM_OFFSET_Z = -1.0; // Room offset on z-axis

// Global variables to control the space travel effect
const travelSpeed = 0.5; // Speed of travel through space
const travelDirection = new THREE.Vector3(0, 0, 1); // Changed to the opposite direction (backward)

// This function creates a simple starfield in space.
// It uses a BufferGeometry to distribute a number of stars
// uniformly in a sphere, and adds them to the scene.
export function createSpaceBackground(scene) {
  // Set the scene background to pure black (space)
  scene.background = new THREE.Color(0x000000);

  const starCount = 10000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);

  // Distribute stars uniformly within a sphere (radius = 2000)
  for (let i = 0; i < starCount; i++) {
    const r = 2000 * Math.cbrt(Math.random()); // cube root for uniform distribution
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = 2 * Math.PI * Math.random();

    positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = r * Math.cos(theta);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const texture = createStarTexture();
  const material = new THREE.PointsMaterial({
    size: 1.5,
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
  });

  const stars = new THREE.Points(geometry, material);
  stars.name = 'starfield'; // Add a name to easily find it later
  scene.add(stars);
  
  // Store travel direction as a property on the stars object
  stars.userData.travelDirection = new THREE.Vector3().copy(travelDirection);
}

// Updated function to create a space travel effect by moving the stars
export function animateBackground(scene, camera) {
  // Find the starfield in the scene
  const starfield = scene.getObjectByName('starfield');
  
  if (starfield && starfield instanceof THREE.Points) {
    // Move stars in the direction of travel
    const positions = starfield.geometry.getAttribute('position');
    const direction = starfield.userData.travelDirection.clone();
    
    // Get the camera position to check room boundaries
    const cameraPosition = camera ? camera.position.clone() : new THREE.Vector3();
    
    // Use the camera's view direction to determine travel direction
    if (camera) {
      // Create a vector pointing in the direction the camera is facing
      direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
      
      // Only use the forward/backward component for the travel effect
      direction.y = 0; // Remove vertical component
      direction.normalize();
    }
    
    // Move each star position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Move the star in the travel direction
      positions.setX(i, x + direction.x * travelSpeed);
      positions.setY(i, y + direction.y * travelSpeed);
      positions.setZ(i, z + direction.z * travelSpeed);
      
      // Check if the star is inside the gallery room boundaries
      // We use the camera's position as the center of the room
      const relativeX = x - cameraPosition.x;
      const relativeY = y - cameraPosition.y;
      const relativeZ = z - cameraPosition.z;
      
      const halfWidth = ROOM_WIDTH / 2;
      const halfLength = ROOM_LENGTH / 2;
      const halfHeight = ROOM_HEIGHT / 2;
      
      // If the star is inside the room or too close to it, reposition it outside
      if (Math.abs(relativeX) < halfWidth + 1 && 
          Math.abs(relativeY) < halfHeight + 1 && 
          Math.abs(relativeZ) < halfLength + 1) {
        
        // Create new position outside the room
        const r = 2000 * Math.random() * 0.3; // Place new stars closer to the camera
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        
        // Place the star outside the room
        const distanceFactor = 25; // Place stars far from the room
        const newX = cameraPosition.x + r * Math.sin(theta) * Math.cos(phi) + (relativeX > 0 ? distanceFactor : -distanceFactor);
        const newY = cameraPosition.y + r * Math.sin(theta) * Math.sin(phi) + (relativeY > 0 ? distanceFactor : -distanceFactor);
        const newZ = cameraPosition.z + r * Math.cos(theta) + (relativeZ > 0 ? distanceFactor : -distanceFactor);
        
        positions.setX(i, newX);
        positions.setY(i, newY);
        positions.setZ(i, newZ);
      }
      
      // If the star is too far away, wrap it around to the other side
      // This creates an infinite travel effect
      const distance = Math.sqrt(
        Math.pow(x - cameraPosition.x, 2) + 
        Math.pow(y - cameraPosition.y, 2) + 
        Math.pow(z - cameraPosition.z, 2)
      );
      
      if (distance > 2000) {
        // Reset the star position to the opposite side of the sphere
        const r = 2000 * Math.random() * 0.3; // Place new stars closer to the camera
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        
        // Calculate new position in the opposite direction of travel
        const newX = cameraPosition.x + r * Math.sin(theta) * Math.cos(phi) - direction.x * 2000;
        const newY = cameraPosition.y + r * Math.sin(theta) * Math.sin(phi) - direction.y * 2000;
        const newZ = cameraPosition.z + r * Math.cos(theta) - direction.z * 2000;
        
        positions.setX(i, newX);
        positions.setY(i, newY);
        positions.setZ(i, newZ);
      }
    }
    
    positions.needsUpdate = true;
    
    // Optional: add subtle rotation for more dynamic effect
    starfield.rotation.y += 0.0001;
  }
}

// Function to change the direction of travel
export function setTravelDirection(direction) {
  if (direction instanceof THREE.Vector3) {
    travelDirection.copy(direction);
  }
}
