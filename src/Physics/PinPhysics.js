import * as THREE from "three";

// ============================================================
// مسؤولية العضو 3: فيزياء الدبابيس
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

function setFallDirection(pin, linearVelocity, angularVelocity) {
  const horizontalSpeed = Math.hypot(linearVelocity.x, linearVelocity.z);
  if (horizontalSpeed > MIN_FALL_SPEED) {
    pin.fallDirection.x = linearVelocity.x / horizontalSpeed;
    pin.fallDirection.z = linearVelocity.z / horizontalSpeed;
    return;
  }
  const angularSpeed = Math.hypot(angularVelocity.x, angularVelocity.z);
  if (angularSpeed > MIN_FALL_SPEED) {
    pin.fallDirection.x = -angularVelocity.z / angularSpeed;
    pin.fallDirection.z = angularVelocity.x / angularSpeed;
  }
}

function updatePinRotation(pin) {
  _tiltAxis.set(pin.fallDirection.z, 0, -pin.fallDirection.x).normalize();
  _tiltQuaternion.setFromAxisAngle(_tiltAxis, pin.tiltAngle);
  _spinQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pin.spinAngle);
  _tiltQuaternion.multiply(_spinQuaternion);

  _rotationEuler.setFromQuaternion(_tiltQuaternion, "XYZ");
  pin.rotation.x = _rotationEuler.x;
  pin.rotation.y = _rotationEuler.y;
  pin.rotation.z = _rotationEuler.z;

  pin.visualLift = PIN_RADIUS * Math.sin(pin.tiltAngle);
}

function resolveBackStop(pin) {
  if (pin.position.z <= PIN_BACK_STOP_Z) return;
  pin.position.z = PIN_BACK_STOP_Z;
  if (pin.velocity.z > 0) pin.velocity.z *= -BACK_STOP_BOUNCE;
  pin.velocity.x *= BACK_STOP_DAMPING;
  pin.spinVelocity *= BACK_STOP_DAMPING;
  pin.tiltVelocity *= BACK_STOP_DAMPING;
}

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
        const mobilityA = getPinMobility(a);
        const mobilityB = getPinMobility(b);
        const totalMobility = mobilityA + mobilityB;

        if (totalMobility <= 0) continue;

        const moveA = (overlap * mobilityA) / totalMobility;
        const moveB = (overlap * mobilityB) / totalMobility;

        a.position.x -= nx * moveA;
        a.position.z -= nz * moveA;
        b.position.x += nx * moveB;
        b.position.z += nz * moveB;

        const relativeVelocityX = b.velocity.x - a.velocity.x;
        const relativeVelocityZ = b.velocity.z - a.velocity.z;
        const closingSpeed = relativeVelocityX * nx + relativeVelocityZ * nz;

        if (closingSpeed < 0) {
          const impulse = -closingSpeed * 0.35;
          if (mobilityA > 0) {
            a.velocity.x -= nx * impulse;
            a.velocity.z -= nz * impulse;
            a.isAtRest = false;
          }
          if (mobilityB > 0) {
            b.velocity.x += nx * impulse;
            b.velocity.z += nz * impulse;
            b.isAtRest = false;
          }
        }
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

    const horizontalSpeed = Math.hypot(vLinear.x, vLinear.z);
    const angularKick = Math.hypot(vAngular.x, vAngular.z);
    const directionBias = ((id % 5) - 2) * 0.012;

    pin.isStanding = false;
    pin.isAtRest = false;
    pin.velocity = { ...vLinear };
    pin.angularVelocity = { ...vAngular };
    pin.tiltAngle = 0;
    pin.tiltVelocity = clamp(
      horizontalSpeed * 2.1 + angularKick * 0.18,
      4.5,
      12,
    );
    pin.spinAngle = 0;
    pin.spinVelocity = clamp(vLinear.x * 4 + vAngular.y * 0.25, -7, 7);
    pin.targetFallenAngle = FALLEN_ANGLE + directionBias;

    setFallDirection(pin, vLinear, vAngular);
    updatePinRotation(pin);
  }

  update(dt) {
    this.pins.forEach((pin) => {
      // نتجاهل فقط الدبابيس التي استقرت تماماً
      if (pin.isAtRest) return;
      // لا نحدث فيزياء الحركة للدبابيس الواقفة
      if (pin.isStanding) return;

      const isOnFloor = pin.position.y <= PIN_REST_Y && pin.velocity.y <= 0;

      if (isOnFloor) {
        pin.position.y = PIN_REST_Y;
        pin.velocity.y = 0;
        const linearDampingFactor = Math.max(0, 1 - FLOOR_LINEAR_DAMPING * dt);
        pin.velocity.x *= linearDampingFactor;
        pin.velocity.z *= linearDampingFactor;
      } else {
        pin.velocity.y -= this.gravity * dt;
      }

      pin.position.x += pin.velocity.x * dt;
      pin.position.y += pin.velocity.y * dt;
      pin.position.z += pin.velocity.z * dt;
      resolveBackStop(pin);

      if (pin.position.y <= PIN_REST_Y && pin.velocity.y <= 0) {
        pin.position.y = PIN_REST_Y;
        pin.velocity.y = 0;
      }

      const tiltRemaining = pin.targetFallenAngle - pin.tiltAngle;
      if (tiltRemaining > 0) {
        const torqueScale = Math.max(
          0.25,
          Math.sin(Math.max(pin.tiltAngle, 0.15)),
        );
        pin.tiltVelocity += TILT_ACCELERATION * torqueScale * dt;
        pin.tiltVelocity *= Math.max(0, 1 - TILT_DAMPING * dt);
        pin.tiltAngle = Math.min(
          pin.targetFallenAngle,
          pin.tiltAngle + pin.tiltVelocity * dt,
        );
      } else {
        pin.tiltAngle = pin.targetFallenAngle;
        pin.tiltVelocity = 0;
      }

      const spinDamping = isOnFloor ? FLOOR_SPIN_DAMPING : AIR_SPIN_DAMPING;
      pin.spinVelocity *= Math.max(0, 1 - spinDamping * dt);
      pin.spinAngle += pin.spinVelocity * dt;

      pin.angularVelocity.x = pin.tiltVelocity * pin.fallDirection.z;
      pin.angularVelocity.y = pin.spinVelocity;
      pin.angularVelocity.z = -pin.tiltVelocity * pin.fallDirection.x;

      updatePinRotation(pin);

      const linearSpeed = Math.hypot(
        pin.velocity.x,
        pin.velocity.y,
        pin.velocity.z,
      );
      const tiltSettled = pin.tiltAngle >= pin.targetFallenAngle - 0.001;
      const spinSettled = Math.abs(pin.spinVelocity) < REST_SPIN_EPSILON;

      if (
        pin.position.y === PIN_REST_Y &&
        tiltSettled &&
        spinSettled &&
        linearSpeed < REST_LINEAR_EPSILON
      ) {
        pin.velocity = { x: 0, y: 0, z: 0 };
        pin.angularVelocity = { x: 0, y: 0, z: 0 };
        pin.tiltVelocity = 0;
        pin.spinVelocity = 0;
        pin.tiltAngle = pin.targetFallenAngle;
        pin.position.y = PIN_REST_Y;
        pin.isAtRest = true;
        updatePinRotation(pin);
      }
    });

    // حل التداخلات لجميع الدبابيس بما فيها الواقفة لضمان التفاعل
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
