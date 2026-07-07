import * as THREE from "three";
import {
  BALL_GUTTER_Y,
  GUTTER_CENTER_X,
  LANE_END_Z,
  LANE_PLAYABLE_HALF_WIDTH,
} from "/src/config/simulationConfig.js";

// ============================================================
// مسؤولية العضو 2: فيزياء الكرة (نسخة مدمجة)
// ============================================================

class BallPhysics {
  constructor(mass, radius, position, gravity = 9.81) {
    this.mass = mass;
    this.radius = radius;
    this.startPosition = position.clone();
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
    this.phase = "idle";
    this.axisTilt = 0;
    this.revRate = 0;
    this.g = gravity;
    this.gutterSide = 0;
  }

  launch(v0, angle, revRate) {
    const angleRad = THREE.MathUtils.degToRad(angle);

    this.revRate = revRate;
    this.position.copy(this.startPosition);
    this.velocity.set(Math.sin(angleRad) * v0, 0, Math.cos(angleRad) * v0);
    this.angularVelocity.set(0, 0, 0);
    this.gutterSide = 0;

    this.axisTilt = THREE.MathUtils.degToRad(
      Math.min(Math.abs(revRate) * 0.08, 30),
    );
    this.phase = "sliding";
  }

  enterGutter(side) {
    this.gutterSide = side;
    this.phase = "gutter";
    this.position.x = side * GUTTER_CENTER_X;
    this.position.y = BALL_GUTTER_Y;
    this.velocity.x = 0;
    this.angularVelocity.x = 0;
    this.angularVelocity.y = 0;
    this.angularVelocity.z = 0;
  }

  update(dt, mu) {
    if (this.phase === "idle" || this.phase === "stopped") return;

    // استخدام الجاذبية الخاصة بكِ من كائن الفيزياء
    const g = this.g;

    if (this.phase === "gutter") {
      this.position.x = this.gutterSide * GUTTER_CENTER_X;
      this.position.y = BALL_GUTTER_Y;
      this.velocity.x = 0;
      this.velocity.z = Math.max(0, this.velocity.z - mu * g * 0.02 * dt);
      this.angularVelocity.x = -(this.velocity.z / this.radius);
    } else if (this.phase === "sliding") {
      const deceleration = mu * g;
      this.velocity.z = Math.max(0, this.velocity.z - deceleration * dt);
      this.velocity.x *= Math.max(0, 1 - mu * dt);

      const angularAcceleration = (5 * mu * g) / (2 * this.radius);
      this.angularVelocity.x -= angularAcceleration * dt;

      const rollingSpeed = Math.abs(this.angularVelocity.x) * this.radius;
      if (this.velocity.z > 0 && rollingSpeed >= this.velocity.z) {
        this.angularVelocity.x = -(this.velocity.z / this.radius);
        this.phase = "pure_rolling";
      }
    } else if (this.phase === "pure_rolling") {
      const frictionForce = mu * this.mass * g;
      const hookTorque = frictionForce * this.radius * Math.sin(this.axisTilt);

      this.velocity.x += (hookTorque / this.mass) * dt;
      this.velocity.z = Math.max(0, this.velocity.z - mu * g * 0.01 * dt);
      this.angularVelocity.x = -(this.velocity.z / this.radius);
    }

    this.position.addScaledVector(this.velocity, dt);

    // التحقق من دخول المجاري
    if (this.phase !== "gutter") {
      const gutterEntryX = LANE_PLAYABLE_HALF_WIDTH - this.radius;
      if (this.position.x <= -gutterEntryX) {
        this.enterGutter(-1);
      } else if (this.position.x >= gutterEntryX) {
        this.enterGutter(1);
      }
    }

    // شروط التوقف
    if (this.velocity.z <= 0.01 || this.position.z >= LANE_END_Z) {
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
      this.phase = "stopped";
    }
  }

  getState() {
    const rotation = new THREE.Euler(
      this.angularVelocity.x,
      this.angularVelocity.y,
      this.angularVelocity.z,
    );

    return {
      position: this.position.clone(),
      rotation,
      phase: this.phase,
      velocity: this.velocity.clone(),
      angularVelocity: this.angularVelocity.clone(),
      gutterSide: this.gutterSide,
      speed: this.velocity.length(),
      angularSpeed: this.angularVelocity.length(),
    };
  }

  reset() {
    this.position.copy(this.startPosition);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.phase = "idle";
    this.axisTilt = 0;
    this.revRate = 0;
    this.gutterSide = 0;
  }
}

export default BallPhysics;
