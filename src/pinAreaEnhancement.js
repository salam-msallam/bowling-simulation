/**
 * ================================================================
 *  PIN AREA ENHANCEMENT MODULE - With Animated Pinsetter
 *
 *  Visual enhancements + fully animated pinsetter machine:
 *
 *  ANIMATION SEQUENCE (triggered via pinsetterController):
 *    Phase 1 — IDLE       : Machine resting above, spotter raised
 *    Phase 2 — LOWER      : Spotter arm descends to pin level
 *    Phase 3 — SCAN       : Brief pause (reads which pins are down)
 *    Phase 4 — LIFT       : Standing pins gripped & lifted up
 *    Phase 5 — SWEEP      : Sweep bar swings forward, clears fallen pins
 *    Phase 6 — REPLACE    : Standing pins lowered back to deck
 *    Phase 7 — RAISE      : All parts rise back to idle position
 *    Phase 8 — IDLE       : Cycle complete
 *
 *  HOW TO USE from main.js:
 *    import { createPinAreaEnhancements } from './pinAreaEnhancement.js';
 *    const { controller } = createPinAreaEnhancements(scene);
 *
 *    // After ball stops and pins settle — call:
 *    controller.startCycle();          // full reset cycle
 *    controller.update(deltaTime);     // call every frame inside gameLoop
 *
 *  ⚠️  PHYSICS NOT TOUCHED — animation is purely visual/geometric.
 * ================================================================
 */

import * as THREE from 'three';

// ════════════════════════════════════════════════════════════════
//  SHARED MATERIALS  (created once, reused)
// ════════════════════════════════════════════════════════════════
const MAT = {
  metalDark:  new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.55, metalness: 0.65 }),
  metalMid:   new THREE.MeshStandardMaterial({ color: 0x3d4248, roughness: 0.50, metalness: 0.70 }),
  metalLight: new THREE.MeshStandardMaterial({ color: 0x565c65, roughness: 0.45, metalness: 0.75 }),
  yellow:     new THREE.MeshStandardMaterial({ color: 0xe8b800, roughness: 0.6,  metalness: 0.1,
                                               emissive: 0x443500, emissiveIntensity: 0.3 }),
  redLight:   new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.4,  metalness: 0.1,
                                               emissive: 0x550000, emissiveIntensity: 0.4 }),
  greenLight: new THREE.MeshStandardMaterial({ color: 0x00ff44, roughness: 0.4,  metalness: 0.1,
                                               emissive: 0x005511, emissiveIntensity: 0.4 }),
};

// ════════════════════════════════════════════════════════════════
//  LERP HELPER
// ════════════════════════════════════════════════════════════════
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(t)    { return Math.max(0, Math.min(1, t)); }
function easeInOut(t)  { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

// ════════════════════════════════════════════════════════════════
//  1.  PIN DECK
// ════════════════════════════════════════════════════════════════
function createPinDeck() {
  const group = new THREE.Group();
  group.name = 'PinDeck';

  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.75, metalness: 0.0 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.06), deckMat);
  deck.position.set(18.4, 0.01, 0);
  deck.receiveShadow = true;
  group.add(deck);

  // Transition strip
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x3a2a0a, roughness: 0.9, metalness: 0.0 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 1.06), stripMat);
  strip.position.set(17.28, 0.015, 0);
  group.add(strip);

  // White edge line
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0xaaaaaa, emissiveIntensity: 0.08 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 1.06), edgeMat);
  edge.position.set(17.31, 0.015, 0);
  group.add(edge);

  // Side gutters
  const gutterMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.85, metalness: 0.0 });
  [-0.575, 0.575].forEach(z => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 0.15), gutterMat);
    g.position.set(18.4, 0.005, z);
    group.add(g);
  });

  return group;
}

// ════════════════════════════════════════════════════════════════
//  2.  ANIMATED PINSETTER MACHINE
//      Returns { group, animParts } where animParts holds all
//      moving sub-groups so the controller can drive them.
// ════════════════════════════════════════════════════════════════
function createPinsetterMachine() {
  const group = new THREE.Group();
  group.name = 'PinsetterMachine';

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.9, 1.1),
    MAT.metalDark
  );
  housing.position.set(20.2, 2.55, 0);
  group.add(housing);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.06, 1.14),
    MAT.metalLight
  );
  lip.position.set(20.2, 2.07, 0);
  group.add(lip);

  const frontPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.75, 1.0),
    MAT.metalMid
  );
  frontPanel.position.set(19.32, 2.55, 0);
  group.add(frontPanel);

  const redLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    MAT.redLight.clone()
  );
  redLed.position.set(19.31, 2.75, -0.2);
  group.add(redLed);

  const greenLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    MAT.greenLight.clone()
  );
  greenLed.position.set(19.31, 2.75, 0.2);
  greenLed.material.emissiveIntensity = 0;
  group.add(greenLed);

  const spotterArm = new THREE.Group();
  spotterArm.name = 'SpotterArm';

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.9, 10),
    MAT.metalMid
  );
  shaft.position.set(0, 0.45, 0);
  spotterArm.add(shaft);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.88),
    MAT.metalLight
  );
  frame.position.set(0, 0, 0);
  spotterArm.add(frame);

  const fingerPositions = [
    { z: 0.0 },
    { z: -0.106 }, { z: 0.106 },
    { z: -0.212 }, { z: 0.0 }, { z: 0.212 },
    { z: -0.318 }, { z: -0.106 }, { z: 0.106 }, { z: 0.318 },
  ];

  fingerPositions.forEach((fp, i) => {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8),
      MAT.metalLight
    );
    finger.position.set(0, -0.11, fp.z);
    finger.name = `Finger_${i}`;
    spotterArm.add(finger);
  });

  spotterArm.position.set(17.6, 2.05, 0);
  group.add(spotterArm);

  const curtain = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.7, 1.06),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.85
    })
  );

  curtain.name = 'Curtain';
  curtain.position.set(19.55, 0.55, 0);
  group.add(curtain);

  return {
    group,
    animParts: {
      spotterArm,
      curtain,
      redLed: redLed.material,
      greenLed: greenLed.material,
    }
  };
}
// ════════════════════════════════════════════════════════════════
//  3.  BACK WALL
// ════════════════════════════════════════════════════════════════
function createPinAreaBackWall() {
  const group = new THREE.Group();
  group.name = 'PinAreaBackWall';

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c2028, roughness: 0.8, metalness: 0.05 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 2.2), wallMat);
 wall.position.set(19.0, 2.0, 0);
  wall.receiveShadow = true;
  group.add(wall);

  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x0d1015, roughness: 0.95, metalness: 0.0 });
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.2), cushionMat);
  cushion.position.set(22.42, 0.25, 0);
  group.add(cushion);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0x22272f, roughness: 0.75, metalness: 0.05 });
  [-0.65, 0.65].forEach(z => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.2), sideMat);
    s.position.set(21.0, 2.0, z);
    group.add(s);
  });

  const panelMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.85, metalness: 0.08 });
  [{ y: 3.2, z: -0.5 }, { y: 3.2, z: 0.5 }, { y: 1.5, z: -0.5 }, { y: 1.5, z: 0.5 }].forEach(p => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.8), panelMat);
    panel.position.set(22.38, p.y, p.z);
    group.add(panel);
  });

  const ventMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.7, metalness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.6), ventMat);
    slat.position.set(22.38, 3.5 - i * 0.09, 0);
    group.add(slat);
  }

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.7, metalness: 0.05 }));
  ceil.position.set(21.0, 4.0, 0);
  group.add(ceil);

  return group;
}

// ════════════════════════════════════════════════════════════════
//  4.  PIN AREA LIGHTING
// ════════════════════════════════════════════════════════════════
function createPinAreaLighting() {
  const group = new THREE.Group();
  group.name = 'PinAreaLighting';

  [{ x: 18.0, y: 3.8, z: -0.4, tz: -0.2 }, { x: 18.0, y: 3.8, z: 0.4, tz: 0.2 }].forEach(cfg => {
    const spot = new THREE.SpotLight(0xfff4e0, 1.4, 8, Math.PI / 7, 0.4);
    spot.position.set(cfg.x, cfg.y, cfg.z);
    spot.castShadow = false;
    spot.target.position.set(18.4, 0, cfg.tz);
    group.add(spot);
    group.add(spot.target);

    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.7 }));
    fixture.position.set(cfg.x, cfg.y + 0.05, cfg.z);
    group.add(fixture);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff8e0 }));
    bulb.position.set(cfg.x, cfg.y - 0.04, cfg.z);
    group.add(bulb);
  });

  const fill = new THREE.PointLight(0xffeedd, 0.6, 5);
  fill.position.set(18.4, 3.2, 0);
  group.add(fill);

  return group;
}

// ════════════════════════════════════════════════════════════════
//  5.  PINSETTER ANIMATION CONTROLLER
//
//      Finite-state machine that drives the animated parts
//      through a realistic pinsetter cycle.
//
//  Public API:
//    controller.startCycle()          — kick off the sequence
//    controller.update(dt)            — call every frame
//    controller.onCycleComplete = fn  — optional callback
// ════════════════════════════════════════════════════════════════
function createPinsetterController(animParts) {
  // Y positions for spotter arm
  const SPOTTER_RAISED   = 2.05;   // resting above housing
  const SPOTTER_LOWERED  = 0.38;   // at pin-deck level (pin base height)
  const SPOTTER_LIFTED   = 1.4;    // holding pins up (mid-height)

  // Sweep bar rotation (around X axis on the pivot)
  const SWEEP_REST    = -Math.PI / 2.2;  // tilted back
  const SWEEP_FORWARD =  0.25;           // swung forward over lane

  // Curtain Y positions
  const CURTAIN_DOWN =  0.55;
  const CURTAIN_UP   =  1.35;

  // Phase durations in seconds
  const PHASE_DURATION = {
    IDLE:    0,
    LOWER:   1.4,   // spotter descends
    SCAN:    0.6,   // pause at bottom
    LIFT:    1.0,   // spotter rises to mid, taking pins
    SWEEP:   1.2,   // sweep bar clears fallen pins
    REPLACE: 1.0,   // spotter descends back, sets pins
    RAISE:   1.3,   // everything returns to top
    DONE:    0.5,   // brief green light
  };

  const PHASES = ['IDLE','LOWER','SCAN','LIFT','SWEEP','REPLACE','RAISE','DONE'];

  let phase      = 'IDLE';
  let phaseTime  = 0;
  let running    = false;

  function setLed(red, green) {
    animParts.redLed.emissiveIntensity   = red   ? 0.8 : 0.0;
    animParts.greenLed.emissiveIntensity = green ? 0.8 : 0.0;
    animParts.redLed.emissive.set(red   ? 0x550000 : 0x000000);
    animParts.greenLed.emissive.set(green ? 0x005511 : 0x000000);
  }

  function advancePhase() {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      phase = PHASES[idx + 1];
      phaseTime = 0;
      console.log(`[Pinsetter] → ${phase}`);
    } else {
      phase = 'IDLE';
      phaseTime = 0;
      running = false;
      setLed(false, false);
      if (controller.onCycleComplete) controller.onCycleComplete();
    }
  }

  const controller = {
    onCycleComplete: null,

    startCycle() {
      if (running) return;
      running   = true;
      phase     = 'LOWER';
      phaseTime = 0;
      setLed(true, false);   // red = machine operating
      console.log('[Pinsetter] Cycle started → LOWER');
    },

    /** Call every frame with dt (seconds) */
   update(dt) {
  if (!running) return;

  phaseTime += dt;

  const dur = PHASE_DURATION[phase] || 0.001;
  const raw = clamp01(phaseTime / dur);
  const t = raw * raw * (3 - 2 * raw);

  // اهتزاز ثابت (ما يتراكم)
  const shake = Math.sin(phaseTime * 35) * 0.002;

  animParts.spotterArm.position.x = 17.6 + shake;
  animParts.spotterArm.position.z = 0;

  switch (phase) {

    case 'LOWER':
      animParts.spotterArm.position.y = THREE.MathUtils.lerp(
        animParts.spotterArm.position.y,
        SPOTTER_LOWERED,
        0.08
      );

      if (phaseTime >= dur) advancePhase();
      break;

    case 'SCAN':
      animParts.spotterArm.children.forEach((c, i) => {
        if (c.name && c.name.startsWith('Finger')) {
          c.scale.z = 1.0 + 0.06 * Math.sin(phaseTime * 8 + i);
        }
      });

      if (phaseTime >= dur) advancePhase();
      break;

    case 'LIFT':
      animParts.spotterArm.position.y = THREE.MathUtils.lerp(
        animParts.spotterArm.position.y,
        SPOTTER_LIFTED,
        0.08
      );

      animParts.curtain.position.y = lerp(
        CURTAIN_DOWN,
        CURTAIN_UP,
        t
      );

      if (phaseTime >= dur) advancePhase();
      break;

    case 'SWEEP':
      animParts.sweepPivot.rotation.x = lerp(
        SWEEP_REST,
        SWEEP_FORWARD,
        t
      );

      if (phaseTime >= dur) advancePhase();
      break;

    case 'REPLACE':
      animParts.spotterArm.position.y = lerp(
        SPOTTER_LIFTED,
        SPOTTER_LOWERED,
        t
      );

      animParts.sweepPivot.rotation.x = lerp(
        SWEEP_FORWARD,
        SWEEP_REST,
        t
      );

      if (phaseTime >= dur) advancePhase();
      break;

    case 'RAISE':
      animParts.spotterArm.position.y = lerp(
        SPOTTER_LOWERED,
        SPOTTER_RAISED,
        t
      );

      animParts.curtain.position.y = lerp(
        CURTAIN_UP,
        CURTAIN_DOWN,
        t
      );

      animParts.spotterArm.children.forEach(c => {
        if (c.name && c.name.startsWith('Finger')) {
          c.scale.z = 1.0;
        }
      });

      if (phaseTime >= dur) advancePhase();
      break;

    case 'DONE':
      setLed(false, Math.sin(phaseTime * 10) > 0);

      if (phaseTime >= dur) {
        setLed(false, false);
        advancePhase();
      }
      break;
  }
},
    /** Read current phase for external HUD display if needed */
    getPhase() { return phase; },
    isRunning() { return running; },
  };

  return controller;
}

// ════════════════════════════════════════════════════════════════
//  6.  MAIN EXPORT
// ════════════════════════════════════════════════════════════════

/**
 * Add all pin area visual enhancements + animated pinsetter to the scene.
 *
 * USAGE in main.js:
 *
 *   import { createPinAreaEnhancements } from './pinAreaEnhancement.js';
 *   const { controller } = createPinAreaEnhancements(scene);
 *
 *   // Inside gameLoop:
 *   controller.update(dt);
 *
 *   // After ball stops:
 *   controller.startCycle();
 *
 *   // Optional callback:
 *   controller.onCycleComplete = () => resetSimulation();
 *
 * @param {THREE.Scene} scene
 * @returns {{ pinDeck, pinsetter, backWall, lighting, controller }}
 */
export function createPinAreaEnhancements(scene) {
  const pinDeck  = createPinDeck();
  const { group: pinsetterGroup, animParts } = createPinsetterMachine();
  const backWall = createPinAreaBackWall();
  const lighting = createPinAreaLighting();

  scene.add(pinDeck);
  scene.add(pinsetterGroup);
  scene.add(backWall);
  scene.add(lighting);

  const controller = createPinsetterController(animParts);

  console.log('✓ Pin Area Enhancements + Animated Pinsetter Added:');
  console.log('  ├─ Pin deck (elevated, darker wood, transition strip)');
  console.log('  ├─ Pinsetter machine with animated spotter arm + sweep bar');
  console.log('  ├─ Status LEDs (red = running, green flash = done)');
  console.log('  ├─ Back wall with industrial depth');
  console.log('  ├─ Focused pin area lighting');
  console.log('  └─ controller.startCycle() / controller.update(dt) ready');
  console.log('  ⚠️  Physics system untouched.');

  return { pinDeck, pinsetter: pinsetterGroup, backWall, lighting, controller };
}