/**
 * ================================================================
 *  BOWLING LANE MODULE - Day 3-4
 *  
 *  Creates a realistic bowling lane with:
 *  - Standard dimensions: 18m length × 1m width × 0.1m thickness
 *  - Wood-like material with realistic surface finish
 *  - Full shadow receiving support
 *  - Optional gutters and approach area
 * ================================================================
 */

import * as THREE from 'three';

/**
 * Create the main bowling lane surface
 * @returns {THREE.Mesh} Bowling lane with wood-like material
 */
export function createBowlingLane() {
  // Lane geometry with standard dimensions
  const geometry = new THREE.BoxGeometry(
    18,      // length (along X-axis)
    0.1,     // thickness (Y-axis)
    1        // width (Z-axis)
  );

  // Wood-like material
  const material = new THREE.MeshStandardMaterial({
    color: 0xc8a96e,           // Warm tan/wood color
    roughness: 0.75,           // Textured wood surface
    metalness: 0.05,           // Minimal metallic content
    side: THREE.FrontSide
  });

  const lane = new THREE.Mesh(geometry, material);

  // Center the lane in the scene
  lane.position.set(9, 0, 0);

  // Shadow configuration
  lane.castShadow = false;    // Lane doesn't cast shadows
  lane.receiveShadow = true;  // Lane receives shadows from ball/lights

  return lane;
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
