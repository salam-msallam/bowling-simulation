/**
 * ================================================================
 *  BOWLING BALL MODULE - Day 3-4
 *  
 *  Creates a realistic bowling ball with:
 *  - Standard 10-pin ball dimensions (0.108m radius)
 *  - High-quality material with metallic sheen
 *  - Full shadow support (cast & receive)
 * ================================================================
 */

import * as THREE from 'three';

/**
 * Create a bowling ball mesh
 * @returns {THREE.Mesh} Bowling ball with shadows enabled
 */
export function createBowlingBall() {
  // Sphere geometry - standard bowling ball radius
  const geometry = new THREE.SphereGeometry(
    0.108,  // radius in meters
    32,     // width segments for smooth surface
    32      // height segments for smooth surface
  );

  // High-quality material with realistic gloss
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a237e,           // Deep blue
    roughness: 0.3,            // Smooth, polished surface
    metalness: 0.2,            // Slight metallic sheen
    side: THREE.FrontSide
  });

  const ball = new THREE.Mesh(geometry, material);

  // Enable shadows
  ball.castShadow = true;
  ball.receiveShadow = true;

  // Position near the beginning of the lane
  ball.position.set(-1.5, 0.108, 0);

  return ball;
}

/**
 * Reset ball to starting position
 * @param {THREE.Mesh} ball - The bowling ball
 */
export function resetBallPosition(ball) {
  ball.position.set(-1.5, 0.108, 0);
  ball.rotation.set(0, 0, 0);
  ball.velocity = new THREE.Vector3(0, 0, 0);
}
