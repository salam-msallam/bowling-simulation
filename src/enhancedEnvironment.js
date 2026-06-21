/**
 * ================================================================
 *  ENHANCED BOWLING HALL ENVIRONMENT - Phase 2
 *  
 *  Creates a complete modern bowling alley interior with:
 *  - Ceiling structure with beams
 *  - Improved walls with materials and depth
 *  - Comprehensive seating areas
 *  - Professional fluorescent lighting system
 *  - Score display screens above lanes
 *  - Polished floor with reflections
 * ================================================================
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
//  CEILING SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create ceiling with structural beams
 * @returns {THREE.Group} Ceiling structure group
 */
function createCeilingStructure() {
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'CeilingStructure';

  // Main ceiling panel
  const ceilingGeometry = new THREE.BoxGeometry(40, 0.3, 5);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a4a,
    roughness: 0.5,
    metalness: 0.05,
    side: THREE.BackSide
  });

  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.set(9, 4, 0);
  ceiling.castShadow = false;
  ceiling.receiveShadow = true;
  ceilingGroup.add(ceiling);

  // Structural beams (cross beams for visual detail)
  const beamMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a5a,
    roughness: 0.6,
    metalness: 0.1
  });

  // Main support beams (along X-axis)
  for (let i = 0; i < 3; i++) {
    const beamGeometry = new THREE.BoxGeometry(40, 0.15, 0.2);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(9, 3.95, -2 + i * 2);
    beam.castShadow = true;
    beam.receiveShadow = true;
    ceilingGroup.add(beam);
  }

  // Cross beams (along Z-axis)
  for (let i = 0; i < 5; i++) {
    const beamGeometry = new THREE.BoxGeometry(0.2, 0.15, 5);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(-2 + i * 4, 3.95, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    ceilingGroup.add(beam);
  }

  console.log('✓ Ceiling structure with beams created');
  return ceilingGroup;
}

// ═══════════════════════════════════════════════════════════════
//  WALL ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create improved side walls with panels and materials
 * @returns {THREE.Group} Walls group
 */
function createImprovedWalls() {
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'ImprovedWalls';

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3a4a,
    roughness: 0.7,
    metalness: 0.02
  });

  // Left wall
  const leftWallGeometry = new THREE.BoxGeometry(40, 3.8, 0.2);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWall.position.set(9, 1.9, -2.6);
  leftWall.castShadow = false;
  leftWall.receiveShadow = true;
  wallsGroup.add(leftWall);

  // Right wall
  const rightWallGeometry = new THREE.BoxGeometry(40, 3.8, 0.2);
  const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
  rightWall.position.set(9, 1.9, 2.6);
  rightWall.castShadow = false;
  rightWall.receiveShadow = true;
  wallsGroup.add(rightWall);

  // Back wall with depth
  const backWallGeometry = new THREE.BoxGeometry(0.3, 3.8, 5);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.set(24.5, 1.9, 0);
  backWall.castShadow = false;
  backWall.receiveShadow = true;
  wallsGroup.add(backWall);

  // Back wall accent/depth (slightly recessed)
  const backAccentGeometry = new THREE.BoxGeometry(2, 3.8, 5);
  const backAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.8,
    metalness: 0.01
  });
  const backAccent = new THREE.Mesh(backAccentGeometry, backAccentMaterial);
  backAccent.position.set(23.5, 1.9, 0);
  backAccent.castShadow = false;
  backAccent.receiveShadow = true;
  wallsGroup.add(backAccent);

  console.log('✓ Improved walls with panels created');
  return wallsGroup;
}

// ═══════════════════════════════════════════════════════════════
//  SEATING SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create expanded seating area with benches and tables
 * @returns {THREE.Group} Seating area group
 */
function createExpandedSeatingArea() {
  const seatingGroup = new THREE.Group();
  seatingGroup.name = 'ExpandedSeating';

  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5a6a,
    roughness: 0.5,
    metalness: 0.05
  });

  // Create rows of benches
  const rows = 4;
  const benchesPerRow = 5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < benchesPerRow; col++) {
      const x = -6 + col * 1.2;
      const z = -3 - row * 1.2;

      // Bench seat
      const seatGeometry = new THREE.BoxGeometry(1.0, 0.15, 0.4);
      const seat = new THREE.Mesh(seatGeometry, benchMaterial);
      seat.position.set(x, 0.4, z);
      seat.castShadow = true;
      seat.receiveShadow = true;
      seatingGroup.add(seat);

      // Bench backrest
      const backrestGeometry = new THREE.BoxGeometry(1.0, 0.7, 0.1);
      const backrest = new THREE.Mesh(backrestGeometry, benchMaterial);
      backrest.position.set(x, 0.85, z - 0.25);
      backrest.castShadow = true;
      backrest.receiveShadow = true;
      seatingGroup.add(backrest);
    }
  }

  // Add tables between seating areas
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6a7a,
    roughness: 0.6,
    metalness: 0.08
  });

  for (let i = 0; i < 3; i++) {
    // Table top
    const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.8);
    const tableTop = new THREE.Mesh(tableTopGeometry, tableMaterial);
    tableTop.position.set(-7 + i * 4, 0.7, -5);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    seatingGroup.add(tableTop);

    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.08, 0.65, 0.08);
    const leg1 = new THREE.Mesh(legGeometry, tableMaterial);
    leg1.position.set(-7.6 + i * 4, 0.325, -4.6);
    leg1.castShadow = true;
    seatingGroup.add(leg1);

    const leg2 = new THREE.Mesh(legGeometry, tableMaterial);
    leg2.position.set(-7.6 + i * 4, 0.325, -5.4);
    leg2.castShadow = true;
    seatingGroup.add(leg2);

    const leg3 = new THREE.Mesh(legGeometry, tableMaterial);
    leg3.position.set(-6.4 + i * 4, 0.325, -4.6);
    leg3.castShadow = true;
    seatingGroup.add(leg3);

    const leg4 = new THREE.Mesh(legGeometry, tableMaterial);
    leg4.position.set(-6.4 + i * 4, 0.325, -5.4);
    leg4.castShadow = true;
    seatingGroup.add(leg4);
  }

  console.log('✓ Expanded seating area with benches and tables created');
  return seatingGroup;
}

// ═══════════════════════════════════════════════════════════════
//  FLUORESCENT LIGHTING SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create professional fluorescent lighting array
 * @returns {THREE.Group} Lighting system group
 */
function createFluorescentLightingSystem() {
  const lightingGroup = new THREE.Group();
  lightingGroup.name = 'FluorescentLighting';

  const lightColor = 0xffffff;
  const lightIntensity = 0.8;

  // Overhead fluorescent strips (along lane length)
  const stripPositionsZ = [-1.5, -0.5, 0.5, 1.5];  // Along 4 lanes
  
  for (let z of stripPositionsZ) {
    // Multiple point lights along the length to simulate continuous strip
    for (let x = 0; x <= 20; x += 4) {
      const light = new THREE.PointLight(lightColor, lightIntensity, 15);
      light.position.set(x, 3.5, z);
      light.castShadow = false;
      lightingGroup.add(light);

      // Visual indicator (small bright sphere)
      const indicatorGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: lightColor,
        emissive: lightColor,
        emissiveIntensity: 0.6
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.copy(light.position);
      lightingGroup.add(indicator);
    }
  }

  // Side accent lights (neon-style, kept from original)
  const neonPositions = [
    { x: 5, y: 2.8, z: -2.5 },
    { x: 10, y: 2.8, z: -2.5 },
    { x: 15, y: 2.8, z: -2.5 },
    { x: 20, y: 2.8, z: -2.5 },
    { x: 5, y: 2.8, z: 2.5 },
    { x: 10, y: 2.8, z: 2.5 },
    { x: 15, y: 2.8, z: 2.5 },
    { x: 20, y: 2.8, z: 2.5 }
  ];

  neonPositions.forEach(pos => {
    const light = new THREE.PointLight(0x6688ff, 0.3, 10);
    light.position.set(pos.x, pos.y, pos.z);
    lightingGroup.add(light);
  });

  console.log('✓ Fluorescent lighting system created');
  return lightingGroup;
}

// ═══════════════════════════════════════════════════════════════
//  SCORE DISPLAY SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create score display screens above lanes
 * @returns {THREE.Group} Score display group
 */
function createScoreDisplays() {
  const displaysGroup = new THREE.Group();
  displaysGroup.name = 'ScoreDisplays';

  // Display positions above each lane
  const displayPositions = [
    { x: 9, z: -1.5 },
    { x: 9, z: -0.5 },
    { x: 9, z: 0.5 },
    { x: 9, z: 1.5 }
  ];

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x0a0a3a,
    emissiveIntensity: 0.3
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    roughness: 0.5,
    metalness: 0.4
  });

  displayPositions.forEach((pos, index) => {
    // Screen frame
    const frameGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.1);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(pos.x, 3.2, pos.z);
    frame.castShadow = true;
    frame.receiveShadow = true;
    displaysGroup.add(frame);

    // Screen display
    const screenGeometry = new THREE.BoxGeometry(1.0, 0.6, 0.05);
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(pos.x, 3.2, pos.z + 0.08);
    screen.castShadow = false;
    screen.receiveShadow = true;
    displaysGroup.add(screen);

    // Emissive glow for digital effect
    const glowGeometry = new THREE.BoxGeometry(1.0, 0.6, 0.02);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(pos.x, 3.2, pos.z + 0.1);
    displaysGroup.add(glow);
  });

  console.log('✓ Score display screens created');
  return displaysGroup;
}

// ═══════════════════════════════════════════════════════════════
//  FLOOR SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create polished reflective floor outside lanes
 * @returns {THREE.Mesh} Floor mesh
 */
function createPolishedFloor() {
  const geometry = new THREE.PlaneGeometry(50, 12);
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x0f1419,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.FrontSide
  });

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(9, -0.1, 0);
  floor.receiveShadow = true;
  floor.castShadow = false;

  return floor;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENVIRONMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════════

/**
 * Create the complete enhanced bowling hall environment
 * 
 * @returns {THREE.Group} Complete environment group with all subsystems
 */
export function createEnhancedBowlingHall() {
  const hallGroup = new THREE.Group();
  hallGroup.name = 'EnhancedBowlingHall';

  // Add all subsystems
  const ceiling = createCeilingStructure();
  const walls = createImprovedWalls();
  const seating = createExpandedSeatingArea();
  const lighting = createFluorescentLightingSystem();
  const displays = createScoreDisplays();
  const floor = createPolishedFloor();

  hallGroup.add(ceiling);
  hallGroup.add(walls);
  hallGroup.add(seating);
  hallGroup.add(lighting);
  hallGroup.add(displays);
  hallGroup.add(floor);

  console.log('✓ Enhanced Bowling Hall Environment Created:');
  console.log('  ├─ Ceiling structure with beams');
  console.log('  ├─ Improved walls with depth');
  console.log('  ├─ Expanded seating (benches & tables)');
  console.log('  ├─ Fluorescent lighting system');
  console.log('  ├─ Score display screens');
  console.log('  └─ Polished reflective floor');

  return hallGroup;
}
