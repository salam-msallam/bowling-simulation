/**
 * ================================================================
 *  BOWLING PIN MODULE - Day 3-4
 *  
 *  Creates realistic 10-pin bowling pins:
 *  - Composite geometry: head (sphere) + neck (cylinder) + body (cylinder)
 *  - Standard bowling pin proportions
 *  - White glossy material with shadow support
 *  - 10-pin standard triangle formation
 * ================================================================
 */

import * as THREE from 'three';
import { scene } from './main.js'

/**
 * Create a single bowling pin
 * @returns {THREE.Group} Pin composed of head, neck, and body
 */
export function createPin() {
  const pinGroup = new THREE.Group();

  // Material: glossy white
  const material = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,           // Off-white
    roughness: 0.35,           // Smooth glossy surface
    metalness: 0.05,           // Minimal metallic content
    side: THREE.FrontSide
  });

  // ─────────────────────────────────────────────────────────────
  //  PIN BODY (main cylinder - tapered)
  // ─────────────────────────────────────────────────────────────
  const bodyGeometry = new THREE.CylinderGeometry(
    0.025,   // radiusTop (smaller at top for taper)
    0.029,   // radiusBottom (slightly wider at base)
    0.24,    // height
    16       // radial segments
  );
  const body = new THREE.Mesh(bodyGeometry, material);
  body.position.y = 0.12;
  body.castShadow = true;
  body.receiveShadow = true;
  pinGroup.add(body);

  // ─────────────────────────────────────────────────────────────
  //  PIN NECK (thin connector)
  // ─────────────────────────────────────────────────────────────
  const neckGeometry = new THREE.CylinderGeometry(
    0.015,   // radiusTop (narrow)
    0.025,   // radiusBottom (connects to body)
    0.08,    // height
    16       // radial segments
  );
  const neck = new THREE.Mesh(neckGeometry, material);
  neck.position.y = 0.28;
  neck.castShadow = true;
  neck.receiveShadow = true;
  pinGroup.add(neck);

  // ─────────────────────────────────────────────────────────────
  //  PIN HEAD (sphere at top)
  // ─────────────────────────────────────────────────────────────
  const headGeometry = new THREE.SphereGeometry(
    0.018,   // radius
    16,      // width segments
    16       // height segments
  );
  const head = new THREE.Mesh(headGeometry, material);
  head.position.y = 0.36;
  head.castShadow = true;
  head.receiveShadow = true;
  pinGroup.add(head);

  // Configure group for shadows
  pinGroup.castShadow = true;
  pinGroup.receiveShadow = true;

  return pinGroup;
}

/**
 * Create 10 bowling pins in standard triangle formation
 * 
 * Formation layout:
 *     1
 *    2 3
 *   4 5 6
 *  7 8 9 10
 *
 * @param {THREE.Scene} scene - Scene to add pins to
 * @returns {THREE.Group[]} Array of 10 pin groups
 */
export function createPinFormation(scene) {
  const pins = [];

  // Realistic spacing between pins (approximately 0.306m / 12 inches apart)
  const spacing = 0.106;  // meters

  // Standard 10-pin bowling positions
  const positions = [
    // Row 1
    { x: 17.5, z: 0.0 },

    // Row 2
    { x: 17.8, z: -spacing },
    { x: 17.8, z: spacing },

    // Row 3
    { x: 18.1, z: -2 * spacing },
    { x: 18.1, z: 0.0 },
    { x: 18.1, z: 2 * spacing },

    // Row 4
    { x: 18.4, z: -3 * spacing },
    { x: 18.4, z: -spacing },
    { x: 18.4, z: spacing },
    { x: 18.4, z: 3 * spacing }
  ];

  // Create each pin at the calculated position
  positions.forEach((pos, index) => {
    const pin = createPin();
    // Y position: pin height (top of head at ~0.38m)
    pin.position.set(pos.x, 0.38, pos.z);
    pin.userData = { index: index + 1 };  // Store pin number
    scene.add(pin);
    pins.push(pin);
  });

  console.log('✓ Created 10 bowling pins in standard triangle formation');
  return pins;
}

/**
 * Reset pins to initial formation
 * @param {THREE.Group[]} pins - Array of pin groups
 */
export function resetPinFormation(pins) {
  const spacing = 0.106;
  const positions = [
    { x: 17.5, z: 0.0 },
    { x: 17.8, z: -spacing },
    { x: 17.8, z: spacing },
    { x: 18.1, z: -2 * spacing },
    { x: 18.1, z: 0.0 },
    { x: 18.1, z: 2 * spacing },
    { x: 18.4, z: -3 * spacing },
    { x: 18.4, z: -spacing },
    { x: 18.4, z: spacing },
    { x: 18.4, z: 3 * spacing }
  ];

  pins.forEach((pin, index) => {
    if (positions[index]) {
      const pos = positions[index];
      pin.position.set(pos.x, 0.38, pos.z);
      pin.rotation.set(0, 0, 0);
    }
  });
}
