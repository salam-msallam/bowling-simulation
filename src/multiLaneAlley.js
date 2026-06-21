/**
 * ================================================================
 *  MULTI-LANE BOWLING ALLEY MODULE - Phase 2
 *  
 *  Creates multiple bowling lanes with:
 *  - 5 lanes total (main lane + 4 additional lanes)
 *  - Proper spacing and lane separators
 *  - Reuses existing lane geometry
 *  - Lane identifiers for future multi-player support
 * ================================================================
 */

import * as THREE from 'three';
import { createBowlingLane, createGutters, createApproachArea } from './bowlingLane.js';

/**
 * Create lane separator (thin vertical divider between lanes)
 * @param {number} z - Z position (height of separator)
 * @param {number} x - X position (along lane)
 * @returns {THREE.Mesh} Lane separator mesh
 */
function createLaneSeparator(z, x = 9) {
  const geometry = new THREE.BoxGeometry(
    18,      // length (along lane)
    0.15,    // height
    0.05     // thickness (thin divider)
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,           // Brown wood color
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.FrontSide
  });

  const separator = new THREE.Mesh(geometry, material);
  separator.position.set(x, 0.075, z);  // Positioned at surface level
  separator.castShadow = false;
  separator.receiveShadow = true;

  return separator;
}

/**
 * Create a single bowling lane with all components
 * @param {number} laneNumber - Lane identifier (1-5)
 * @param {number} zOffset - Z-axis offset for lane position
 * @returns {THREE.Group} Complete lane group with lane, gutters, approach
 */
function createLaneAtPosition(laneNumber, zOffset) {
  const laneGroup = new THREE.Group();
  laneGroup.name = `BowlingLane_${laneNumber}`;

  // Create lane components
  const lane = createBowlingLane();
  const gutters = createGutters();
  const approach = createApproachArea();

  // Offset all components to Z position
  lane.position.z = zOffset;
  gutters.position.z = zOffset;
  approach.position.z = zOffset;

  // Add to group
  laneGroup.add(lane);
  laneGroup.add(gutters);
  laneGroup.add(approach);

  // Store metadata
  laneGroup.userData = { laneNumber, zOffset };

  return laneGroup;
}

/**
 * Create the complete multi-lane bowling alley structure
 * 5 lanes total with proper spacing
 * 
 * Layout:
 *  Lane 1: z = -2.0
 *  Lane 2: z = -1.0
 *  Lane 3: z =  0.0  (main lane, center)
 *  Lane 4: z =  1.0
 *  Lane 5: z =  2.0
 * 
 * Spacing: 1.0m between lane centers (includes gutter width ~1.05m and lane width ~1.0m)
 * 
 * @returns {THREE.Group} Multi-lane structure group
 */
export function createMultiLaneBowlingAlley() {
  const multiLaneGroup = new THREE.Group();
  multiLaneGroup.name = 'MultiLaneBowlingAlley';

  // Lane spacing configuration
  const laneSpacing = 1.05;  // Distance between lane centers
  const mainLaneZ = 0.0;     // Center lane at Z = 0

  // Create 5 lanes
  const laneConfigs = [
    { number: 1, offset: mainLaneZ - 2 * laneSpacing },
    { number: 2, offset: mainLaneZ - 1 * laneSpacing },
    { number: 3, offset: mainLaneZ },                    // Main/center lane
    { number: 4, offset: mainLaneZ + 1 * laneSpacing },
    { number: 5, offset: mainLaneZ + 2 * laneSpacing }
  ];

  const lanes = [];

  laneConfigs.forEach(config => {
    const lane = createLaneAtPosition(config.number, config.offset);
    multiLaneGroup.add(lane);
    lanes.push(lane);
  });

  // Add lane separators between lanes
  const separators = [];
  for (let i = 0; i < 4; i++) {
    const separatorZ = mainLaneZ - 1.5 * laneSpacing + i * laneSpacing;
    const separator = createLaneSeparator(separatorZ);
    multiLaneGroup.add(separator);
    separators.push(separator);
  }

  console.log('✓ Multi-Lane Bowling Alley Created:');
  console.log(`  - 5 lanes (spacing: ${laneSpacing}m)`);
  console.log(`  - Lane positions: Z = ${laneConfigs.map(c => c.offset.toFixed(1)).join(', ')}`);
  console.log(`  - 4 lane separators`);

  multiLaneGroup.userData = { lanes, separators };

  return multiLaneGroup;
}

/**
 * Get specific lane by number
 * @param {THREE.Group} multiLaneGroup - Multi-lane group
 * @param {number} laneNumber - Lane number (1-5)
 * @returns {THREE.Group|null} Lane group or null if not found
 */
export function getLaneByNumber(multiLaneGroup, laneNumber) {
  return multiLaneGroup.getObjectByName(`BowlingLane_${laneNumber}`);
}

/**
 * Get center lane (main playable lane)
 * @param {THREE.Group} multiLaneGroup - Multi-lane group
 * @returns {THREE.Group} Center lane (lane 3)
 */
export function getCenterLane(multiLaneGroup) {
  return getLaneByNumber(multiLaneGroup, 3);
}
