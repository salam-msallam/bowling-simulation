
/**
 * ================================================================
 *  ENVIRONMENT & LIGHTING SETUP - Day 1-2
 *  
 *  Foundational Three.js scene configuration for 3D Bowling Sim
 *  - Scene, Camera, Renderer initialization
 *  - Shadow map activation & configuration
 *  - Dual ambient lighting + SpotLight with shadows
 *  - Placeholder ground with GridHelper for visual verification
 * ================================================================
 */

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
//  1. SCENE INITIALIZATION
// ─────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);  // Dark background
scene.fog = new THREE.Fog(0x111827, 50, 100); // Atmospheric fog

// ─────────────────────────────────────────────────────────────
//  2. CAMERA SETUP (Positioned for bowling lane view)
// ─────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(
  75,                                    // Field of view (degrees)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                                   // Near clipping plane
  1000                                   // Far clipping plane
);

// Position camera to look down a bowling lane (elevated, behind starting point)
camera.position.set(-2, 1.8, 0);  // X: side offset, Y: height, Z: forward
camera.lookAt(15, 0.5, 0);        // Look toward end of lane

// ─────────────────────────────────────────────────────────────
//  3. RENDERER SETUP
// ─────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({
  antialias: true,    // Enable antialiasing for smooth edges
  powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);  // Handle high-DPI displays

// Append renderer canvas to DOM
document.body.appendChild(renderer.domElement);

// ─────────────────────────────────────────────────────────────
//  4. SHADOW MAP ACTIVATION & CONFIGURATION
// ─────────────────────────────────────────────────────────────

// Enable shadow rendering globally
renderer.shadowMap.enabled = true;

// Use soft shadows for more realistic appearance
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Optimize shadow rendering
renderer.shadowMap.autoUpdate = true;

// ─────────────────────────────────────────────────────────────
//  5. WINDOW RESIZE HANDLER
// ─────────────────────────────────────────────────────────────

const onWindowResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Update camera aspect ratio
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(width, height);
};

window.addEventListener('resize', onWindowResize);

// ─────────────────────────────────────────────────────────────
//  6. DUAL AMBIENT LIGHTING (0.3 intensity each)
// ─────────────────────────────────────────────────────────────

// First ambient light - cool blue tone for fill
const ambientLight1 = new THREE.AmbientLight(0x6688cc, 0.3);
scene.add(ambientLight1);

// Second ambient light - warm tone for subtle global illumination
const ambientLight2 = new THREE.AmbientLight(0xffcc88, 0.3);
scene.add(ambientLight2);

// ─────────────────────────────────────────────────────────────
//  7. MAIN SPOTLIGHT (Above bowling lane with shadows)
// ─────────────────────────────────────────────────────────────

const spotLight = new THREE.SpotLight(
  0xffffff,    // Color (white)
  1.5          // Intensity
);

// Position above starting area of bowling lane
spotLight.position.set(9, 8, 0);  // Centered above lane, elevated

// Spotlight configuration
spotLight.angle = 0.6;            // Beam angle (wider for full coverage)
spotLight.penumbra = 0.4;         // Soft edge falloff
spotLight.decay = 2;              // Light falloff over distance
spotLight.distance = 50;          // Maximum light range

// Enable shadow casting
spotLight.castShadow = true;

// Shadow map configuration (high quality)
spotLight.shadow.mapSize.width = 2048;   // Shadow texture resolution
spotLight.shadow.mapSize.height = 2048;

spotLight.shadow.camera.near = 0.5;      // Shadow camera near plane
spotLight.shadow.camera.far = 50;        // Shadow camera far plane
spotLight.shadow.camera.left = -15;
spotLight.shadow.camera.right = 15;
spotLight.shadow.camera.top = 15;
spotLight.shadow.camera.bottom = -15;

spotLight.shadow.bias = -0.0001;         // Reduce shadow artifacts
spotLight.shadow.normalBias = 0.02;      // Prevent surface shadows

// Point spotlight at lane center
spotLight.target.position.set(9, 0, 0);

scene.add(spotLight);
scene.add(spotLight.target);

// ─────────────────────────────────────────────────────────────
//  8. PLACEHOLDER GROUND PLANE (Receives shadows)
// ─────────────────────────────────────────────────────────────

// Create a large plane that serves as the bowling lane surface
const groundGeometry = new THREE.PlaneGeometry(25, 2);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8a96e,      // Tan/wood color
  roughness: 0.7,
  metalness: 0.05,
  side: THREE.DoubleSide
});

const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2;  // Rotate to horizontal
groundPlane.position.y = 0;

// Critical: Allow this plane to receive shadows
groundPlane.receiveShadow = true;

scene.add(groundPlane);

// ─────────────────────────────────────────────────────────────
//  9. VISUAL AID: GridHelper
// ─────────────────────────────────────────────────────────────

// Create a grid to visualize the bowling lane dimensions and lighting
const gridHelper = new THREE.GridHelper(
  30,    // Grid size (width/depth)
  60,    // Number of divisions
  0x444466,  // Center line color (subtle)
  0x333344   // Grid color (very subtle)
);

gridHelper.position.y = 0.01;  // Slightly above ground plane to prevent z-fighting
scene.add(gridHelper);

// ─────────────────────────────────────────────────────────────
//  10. OPTIONAL: Light Helper (Debug visualization)
// ─────────────────────────────────────────────────────────────

// Uncomment to visualize SpotLight cone and shadow camera
// const spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);

// const shadowCameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
// scene.add(shadowCameraHelper);

// ─────────────────────────────────────────────────────────────
//  11. EXPORT PUBLIC API
// ─────────────────────────────────────────────────────────────

export {
  scene,
  camera,
  renderer,
  groundPlane,
  gridHelper,
  spotLight,
  ambientLight1,
  ambientLight2
};
