/**
 * ================================================================
 *  BOWLING LANE MODULE - Day 3-4 / Day 5-6 Update
 *  
 *  Creates a realistic bowling lane with:
 *  - Standard dimensions: 18m length × 1m width × 0.1m thickness
 *  - Two distinct zones: Oil Zone (0-12m) and Dry Zone (12-18m)
 *  - Wood-like material with realistic surface finish
 *  - Full shadow receiving support
 *  - Optional gutters and approach area
 * ================================================================
 */

import * as THREE from 'three';

/**
 * Create the oil zone of the bowling lane (0m to 12m)
 * High glossy surface for better ball control feedback
 * @returns {THREE.Mesh} Oil zone with glossy material
 */
export function createOilZone() {
  // Oil zone geometry: first 12 meters of lane
  const geometry = new THREE.BoxGeometry(
    12,      // length (0m to 12m along X-axis)
    0.1,     // thickness (Y-axis)
    1        // width (Z-axis)
  );

  // Highly reflective, glossy material
  const material = new THREE.MeshStandardMaterial({
    color: 0xc8a96e,           // Tan/wood color
    roughness: 0.1,            // Very smooth, glossy surface
    metalness: 0.05,           // Minimal metallic
    side: THREE.FrontSide,
    envMapIntensity: 1.0
  });

  const oilZone = new THREE.Mesh(geometry, material);

  // Position: centered in X for the first 12m (from 0 to 12)
  // Actual lane center is at x=9, so oil zone center is at x=3
  oilZone.position.set(3, 0, 0);

  // Shadow configuration
  oilZone.castShadow = false;
  oilZone.receiveShadow = true;

  return oilZone;
}

/**
 * Create the dry zone of the bowling lane (12m to 18m)
 * Matte surface with less reflection for pin impact zone
 * @returns {THREE.Mesh} Dry zone with matte material
 */
export function createDryZone() {
  // Dry zone geometry: last 6 meters of lane (12m to 18m)
  const geometry = new THREE.BoxGeometry(
    6,       // length (12m to 18m along X-axis)
    0.1,     // thickness (Y-axis)
    1        // width (Z-axis)
  );

  // Matte, less reflective material
  const material = new THREE.MeshStandardMaterial({
    color: 0xb8936e,           // Slightly darker tan for visual distinction
    roughness: 0.6,            // Rough, matte surface
    metalness: 0.02,           // Minimal metallic
    side: THREE.FrontSide,
    envMapIntensity: 0.6
  });

  const dryZone = new THREE.Mesh(geometry, material);

  // Position: centered in X for the last 6m (from 12 to 18)
  // Actual lane center is at x=9, so dry zone center is at x=15
  dryZone.position.set(15, 0, 0);

  // Shadow configuration
  dryZone.castShadow = false;
  dryZone.receiveShadow = true;

  return dryZone;
}

/**
 * Create a single unified lane with zone boundaries visible
 * This version creates the full lane using the oil and dry zones
 * 
 * @returns {THREE.Group} Group containing oil and dry zones
 */
export function createBowlingLane() {
  const laneGroup = new THREE.Group();
  laneGroup.name = 'BowlingLane';

  // Create and add oil zone
  const oilZone = createOilZone();
  laneGroup.add(oilZone);

  // Create and add dry zone
  const dryZone = createDryZone();
  laneGroup.add(dryZone);

  return laneGroup;
}

/**
 * Create gutter guides on both sides of the lane
 * @returns {THREE.Group} Group containing left and right gutters
 */
export function createGutters() {
  const gutterGroup = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({
    color: 0x4a3a2a,           // Dark brown
    roughness: 0.8,
    metalness: 0.02,
    side: THREE.FrontSide
  });

  // Left gutter
  const leftGeometry = new THREE.BoxGeometry(18, 0.08, 0.15);
  const leftGutter = new THREE.Mesh(leftGeometry, material);
  leftGutter.position.set(9, 0.02, -0.575);
  leftGutter.castShadow = false;
  leftGutter.receiveShadow = true;
  gutterGroup.add(leftGutter);

  // Right gutter
  const rightGeometry = new THREE.BoxGeometry(18, 0.08, 0.15);
  const rightGutter = new THREE.Mesh(rightGeometry, material);
  rightGutter.position.set(9, 0.02, 0.575);
  rightGutter.castShadow = false;
  rightGutter.receiveShadow = true;
  gutterGroup.add(rightGutter);

  return gutterGroup;
}

/**
 * Create the approach area (player standing area)
 * @returns {THREE.Mesh} Approach area surface
 */
export function createApproachArea() {
  const geometry = new THREE.BoxGeometry(3, 0.05, 1.5);

  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,           // Dark gray
    roughness: 0.9,            // Rough for grip
    metalness: 0,
    side: THREE.FrontSide
  });

  const approach = new THREE.Mesh(geometry, material);
  approach.position.set(-1.5, 0, 0);
  approach.castShadow = false;
  approach.receiveShadow = true;

  return approach;
}

/**
 * Create complete lane environment and add to scene
 * @param {THREE.Scene} scene - Scene to add objects to
 * @returns {Object} References to lane, gutters, and approach
 */
export function createLaneEnvironment(scene) {
  const lane = createBowlingLane();
  const gutters = createGutters();
  const approach = createApproachArea();

  scene.add(lane);
  scene.add(gutters);
  scene.add(approach);

  console.log('✓ Created bowling lane with gutters and approach area');

  return { lane, gutters, approach };
}
