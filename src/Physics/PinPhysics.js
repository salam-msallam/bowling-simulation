import * as THREE from "three";

// ============================================================
// مسؤولية العضو 3: فيزياء الدبابيس (نسخة مدمجة)
// ============================================================

const INIT_POSITIONS = [
  { x: 0.0, z: 17.0 },
  { x: -0.15, z: 17.3 },
  { x: 0.15, z: 17.3 },
  { x: -0.3, z: 17.6 },
  { x: 0.0, z: 17.6 },
  { x: 0.3, z: 17.6 },
  { x: -0.45, z: 17.9 },
  { x: -0.15, z: 17.9 },
  { x: 0.15, z: 17.9 },
  { x: 0.45, z: 17.9 },
];

const PIN_REST_Y = 0.19;
const GRAVITY = 9.81;
const PIN_RADIUS = 0.055;
const PIN_STANDING_COLLISION_RADIUS = 0.075;
const PIN_FALLEN_COLLISION_RADIUS = 0.13;
const MIN_FALL_SPEED = 0.08;
const FALLEN_ANGLE = Math.PI / 2;
const FLOOR_LINEAR_DAMPING = 3.6;
const FLOOR_SPIN_DAMPING = 4.4;
const AIR_SPIN_DAMPING = 0.65;
const TILT_ACCELERATION = 24;
const TILT_DAMPING = 1.35;
const REST_LINEAR_EPSILON = 0.025;
const REST_SPIN_EPSILON = 0.04;

const PIN_BACK_STOP_Z = 18.85;
const BACK_STOP_BOUNCE = 0.16;
const BACK_STOP_DAMPING = 0.42;

const _tiltAxis = new THREE.Vector3();
const _tiltQuaternion = new THREE.Quaternion();
const _spinQuaternion = new THREE.Quaternion();
const _rotationEuler = new THREE.Euler();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makePin(index, position) {
  return {
    id: index,
    position: { x: position.x, y: PIN_REST_Y, z: position.z },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    fallDirection: { x: 0, z: 1 },
    tiltAngle: 0,
    tiltVelocity: 0,
    spinAngle: 0,
    spinVelocity: 0,
    targetFallenAngle: FALLEN_ANGLE,
    visualLift: 0,
    isStanding: true,
    isAtRest: false,
  };
}

// الدوال المساعدة (setFallDirection, updatePinRotation, resolveBackStop) تبقى كما هي...
// ملاحظة: تأكدي أنها موجودة في ملفك، سأضع الدوال الجديدة هنا:

function getPinCollisionRadius(pin) {
  return pin.isStanding
    ? PIN_STANDING_COLLISION_RADIUS
    : PIN_FALLEN_COLLISION_RADIUS;
}

function getPinMobility(pin) {
  return pin.isStanding ? 0 : 1;
}

function resolvePinToPinOverlaps(pins) {
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const a = pins[i];
        const b = pins[j];
        if (a.isStanding && b.isStanding) continue;

        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distance = Math.hypot(dx, dz);
        const minDistance = getPinCollisionRadius(a) + getPinCollisionRadius(b);

        if (distance >= minDistance) continue;

        const nx = distance > 0.0001 ? dx / distance : 1;
        const nz = distance > 0.0001 ? dz / distance : 0;
        const overlap = minDistance - distance;
        const totalMobility = getPinMobility(a) + getPinMobility(b);
        if (totalMobility <= 0) continue;

        const moveA = (overlap * getPinMobility(a)) / totalMobility;
        const moveB = (overlap * getPinMobility(b)) / totalMobility;
        a.position.x -= nx * moveA;
        a.position.z -= nz * moveA;
        b.position.x += nx * moveB;
        b.position.z += nz * moveB;
      }
    }
  }
}

export class PinPhysics {
  constructor() {
    this.mass = 1.53;
    this.gravity = 9.81;
    this.pins = INIT_POSITIONS.map((p, i) => makePin(i, p));
  }
  setGravity(g) {
    this.gravity = g;
  }

  knockPin(
    id,
    vLinear = { x: 0, y: 0, z: 5 },
    vAngular = { x: 5, y: 0, z: 0 },
  ) {
    const pin = this.pins[id];
    if (!pin || !pin.isStanding) return;
    // ... (منطق الـ knockPin الخاص بكِ)
    pin.isStanding = false;
    pin.isAtRest = false;
    pin.velocity = { ...vLinear };
    // ... باقي المنطق
  }

  update(dt) {
    this.pins.forEach((pin) => {
      if (pin.isStanding || pin.isAtRest) return;
      // ... (منطق الـ update الخاص بكِ مع دمج الجاذبية و resolveBackStop)
    });

    // دمج التعديل الجديد:
    resolvePinToPinOverlaps(this.pins);
  }

  getStates() {
    return this.pins.map((pin) => ({
      id: pin.id,
      position: { ...pin.position },
      rotation: { ...pin.rotation },
      isStanding: pin.isStanding,
      isAtRest: pin.isAtRest,
      visualLift: pin.visualLift,
    }));
  }

  reset() {
    this.pins.forEach((pin, index) => {
      Object.assign(pin, makePin(index, INIT_POSITIONS[index]));
    });
  }
}
