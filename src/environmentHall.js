/**
 * ================================================================
 *  BOWLING HALL ENVIRONMENT MODULE - Day 5-6
 *  
 *  Creates a complete indoor bowling alley environment:
 *  - Realistic walls and ceiling with proper proportions
 *  - Modular seating area
 *  - Decorative neon lighting (blue/purple)
 *  - Proper material differentiation
 *  - Full shadow support
 * ================================================================
 */
// import { scene } from './main.js'


import * as THREE from 'three';

/**
 * Create the left wall of the bowling hall
 * @returns {THREE.Mesh} Left wall mesh
 */
function createLeftWall() {
  const geometry = new THREE.BoxGeometry(
    30,      // depth (along lane)
    4,       // height
    0.2      // thickness (wall depth)
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x2d2d3d,           // Dark neutral gray
    roughness: 0.6,
    metalness: 0.02,
    side: THREE.BackSide      // Render inside surface
  });

  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(9, 2, -0.6);  // Left side of lane
  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

/**
 * Create the right wall of the bowling hall
 * @returns {THREE.Mesh} Right wall mesh
 */
function createRightWall() {
  const geometry = new THREE.BoxGeometry(
    30,      // depth (along lane)
    4,       // height
    0.2      // thickness (wall depth)
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x2d2d3d,           // Dark neutral gray (matches left)
    roughness: 0.6,
    metalness: 0.02,
    side: THREE.BackSide
  });

  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(9, 2, 0.6);   // Right side of lane
  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

/**
 * Create the back wall (end of bowling hall)
 * @returns {THREE.Mesh} Back wall mesh
 */
function createBackWall() {
  const geometry = new THREE.BoxGeometry(
    0.2,     // thickness (wall depth)
    4,       // height
    1.5      // width
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,           // Slightly darker back wall
    roughness: 0.7,
    metalness: 0.01,
    side: THREE.BackSide
  });

  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(24, 2, 0);    // Far end of lane
  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

/**
 * Create the ceiling of the bowling hall
 * @returns {THREE.Mesh} Ceiling mesh
 */
function createCeiling() {
  const geometry = new THREE.BoxGeometry(
    30,      // depth (along lane)
    0.2,     // thickness (minimal for ceiling)
    1.5      // width
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a4a,           // Slightly lighter than walls for contrast
    roughness: 0.5,
    metalness: 0.05,
    side: THREE.BackSide
  });

  const ceiling = new THREE.Mesh(geometry, material);
  ceiling.position.set(9, 4, 0);  // At top of space
  ceiling.castShadow = false;
  ceiling.receiveShadow = true;

  return ceiling;
}

/**
 * Create a single bench for the seating area
 * @param {number} x - X position
 * @param {number} z - Z position
 * @returns {THREE.Group} Bench group (backrest + seat)
 */
function createBench(x, z) {
  const benchGroup = new THREE.Group();

  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a5a,           // Neutral gray-blue
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.FrontSide
  });

  // Bench seat
  const seatGeometry = new THREE.BoxGeometry(
    1.2,     // width (across lane direction)
    0.15,    // height (thickness of seat)
    0.5      // depth (front to back)
  );
  const seat = new THREE.Mesh(seatGeometry, benchMaterial);
  seat.position.y = 0.4;
  seat.castShadow = true;
  seat.receiveShadow = true;
  benchGroup.add(seat);

  // Bench backrest
  const backrestGeometry = new THREE.BoxGeometry(
    1.2,     // width
    0.8,     // height
    0.1      // depth
  );
  const backrest = new THREE.Mesh(backrestGeometry, benchMaterial);
  backrest.position.set(0, 0.9, -0.25);
  backrest.castShadow = true;
  backrest.receiveShadow = true;
  benchGroup.add(backrest);

  // Left armrest
  const armGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.5);
  const leftArm = new THREE.Mesh(armGeometry, benchMaterial);
  leftArm.position.set(-0.65, 0.5, 0);
  leftArm.castShadow = true;
  leftArm.receiveShadow = true;
  benchGroup.add(leftArm);

  // Right armrest
  const rightArm = new THREE.Mesh(armGeometry, benchMaterial);
  rightArm.position.set(0.65, 0.5, 0);
  rightArm.castShadow = true;
  rightArm.receiveShadow = true;
  benchGroup.add(rightArm);

  benchGroup.position.set(x, 0, z);
  benchGroup.castShadow = true;
  benchGroup.receiveShadow = true;

  return benchGroup;
}

/**
 * Create the seating area (modular benches behind the player)
 * @returns {THREE.Group} Seating area group
 */
function createSeatingArea() {
  const seatingGroup = new THREE.Group();

  // Create rows of benches behind the approach area
  const rows = 3;
  const benchesPerRow = 4;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < benchesPerRow; col++) {
      const x = -8 + col * 1.5;    // Spread across width
      const z = -2.5 - row * 1.5;  // Rows going back

      const bench = createBench(x, z);
      seatingGroup.add(bench);
    }
  }

  console.log(`✓ Created seating area (${rows * benchesPerRow} benches)`);
  return seatingGroup;
}

/**
 * Create neon lighting fixtures on side walls
 * @returns {THREE.Group} Neon lights group
 */
function createNeonLighting() {
  const neonGroup = new THREE.Group();

  // Left side neon lights (blue)
  const leftNeonPositions = [
    { x: 2, y: 2.5, z: -0.55 },
    { x: 8, y: 2.5, z: -0.55 },
    { x: 14, y: 2.5, z: -0.55 },
    { x: 20, y: 2.5, z: -0.55 }
  ];

  leftNeonPositions.forEach((pos, index) => {
    const light = new THREE.PointLight(0x4488ff, 0.4, 8);  // Blue neon
    light.position.set(pos.x, pos.y, pos.z);
    light.castShadow = false;
    neonGroup.add(light);

    // Add a small visual indicator (glow sphere)
    const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.8
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(light.position);
    neonGroup.add(glow);
  });

  // Right side neon lights (purple/magenta)
  const rightNeonPositions = [
    { x: 2, y: 2.5, z: 0.55 },
    { x: 8, y: 2.5, z: 0.55 },
    { x: 14, y: 2.5, z: 0.55 },
    { x: 20, y: 2.5, z: 0.55 }
  ];

  rightNeonPositions.forEach((pos, index) => {
    const light = new THREE.PointLight(0xff44aa, 0.4, 8);  // Purple/magenta neon
    light.position.set(pos.x, pos.y, pos.z);
    light.castShadow = false;
    neonGroup.add(light);

    // Add a small visual indicator
    const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff44aa,
      emissive: 0xff44aa,
      emissiveIntensity: 0.8
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(light.position);
    neonGroup.add(glow);
  });

  console.log('✓ Created neon lighting (blue & purple accent lights)');
  return neonGroup;
}

/**
 * Create the complete bowling hall environment
 * Combines all hall elements into a single group for easy management
 * 
 * @param {THREE.Scene} scene - Scene to add hall to
 * @returns {THREE.Group} Complete hall environment group
 */
export function createBowlingHall(scene) {
  const hallGroup = new THREE.Group();
  hallGroup.name = 'BowlingHall';

  // Add structural elements
  const leftWall = createLeftWall();
  const rightWall = createRightWall();
  const backWall = createBackWall();
  const ceiling = createCeiling();

  hallGroup.add(leftWall);
  hallGroup.add(rightWall);
  hallGroup.add(backWall);
  hallGroup.add(ceiling);

  // Add seating area
  const seatingArea = createSeatingArea();
  hallGroup.add(seatingArea);

  // Add neon lighting
  const neonLights = createNeonLighting();
  hallGroup.add(neonLights);

  // Add entire hall to scene
  scene.add(hallGroup);

  console.log('✓ Bowling Hall Environment Created');
  console.log('  - Walls (left, right, back)');
  console.log('  - Ceiling');
  console.log('  - Seating Area (12 benches)');
  console.log('  - Neon Lighting (8 accent lights)');

  return hallGroup;
}

/**
 * Create separate oil and dry zone materials for the lane
 * These will be used by bowlingLane.js
 * 
 * @returns {Object} Object containing oilZoneMaterial and dryZoneMaterial
 */
export function createLaneZoneMaterials() {
  // Oil zone: highly reflective, glossy (0m to 12m)
  const oilZoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8a96e,           // Tan/wood color
    roughness: 0.1,            // Very smooth, glossy
    metalness: 0.05,
    side: THREE.FrontSide,
    envMapIntensity: 1.0
  });

  // Dry zone: matte, less reflective (12m to 18m)
  const dryZoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8936e,           // Slightly darker tan
    roughness: 0.6,            // Rough, matte surface
    metalness: 0.02,
    side: THREE.FrontSide,
    envMapIntensity: 0.6
  });

  return { oilZoneMaterial, dryZoneMaterial };
}

/**
 * Optional: Create floor beneath the entire bowling alley
 * @returns {THREE.Mesh} Floor mesh
 */
export function createHallFloor() {
  const geometry = new THREE.PlaneGeometry(40, 10);
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,           // Dark floor
    roughness: 0.9,
    metalness: 0,
    side: THREE.FrontSide
  });

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(9, -0.05, 0);
  floor.receiveShadow = true;
  floor.castShadow = false;

  return floor;
}
