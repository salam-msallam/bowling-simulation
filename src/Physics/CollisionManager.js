import * as THREE from "three";

// ============================================================
// مسؤولية العضو 3: التصادمات (النسخة الأصلية)
// ============================================================

export class CollisionManager {
  constructor(ball, pinManager) {
    this.ball = ball;
    this.pinManager = pinManager;

    // أبعاد تقريبية بالمتر تستخدم لحساب مسافة التماس بين الكرة والدبوس.
    this.ballRadius = 0.108;
    this.pinRadius = 0.06;
    this.collisionThreshold = this.ballRadius + this.pinRadius;
  }

  checkCollisions() {
    // تصادم الكرة مع الدبابيس
    this.pinManager.pins.forEach((pin) => {
      if (!pin.isStanding) return;

      const dx = this.ball.position.x - pin.position.x;
      const dz = this.ball.position.z - pin.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= this.collisionThreshold) {
        this.handleBallPinCollision(pin, dx, dz);
      }
    });

    // تصادم الدبابيس ببعضها (تأثير الدومينو)
    this.checkPinToPinCollisions();
  }

  handleBallPinCollision(pin, dx, dz) {
    const angle = Math.atan2(dx, dz);
    const mBall = this.ball.mass;
    const mPin = this.pinManager.mass;
    const vBallXInit = this.ball.velocity.x;
    const vBallZInit = this.ball.velocity.z;
    const cr = 0.7;

    const vPinX =
      vBallXInit * (1 + cr) * (mBall / (mBall + mPin)) * Math.sin(angle);
    const vPinZ =
      vBallZInit * (1 + cr) * (mBall / (mBall + mPin)) * Math.cos(angle);
    const vPinY = Math.sqrt(vPinX * vPinX + vPinZ * vPinZ) * 0.4;

    const vPinAngular = {
      x: vPinZ * 4,
      y: 0,
      z: -vPinX * 4,
    };

    this.pinManager.knockPin(
      pin.id,
      { x: vPinX, y: vPinY, z: vPinZ },
      vPinAngular,
    );

    this.ball.velocity.x = vBallXInit - (mPin / mBall) * vPinX;
    this.ball.velocity.z = vBallZInit - (mPin / mBall) * vPinZ;
  }

  checkPinToPinCollisions() {
    const pins = this.pinManager.pins;
    const pinPinThreshold = this.pinRadius * 2;

    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const p1 = pins[i];
        const p2 = pins[j];

        // شرط التصادم: واحد واقف وواحد متحرك
        if (p1.isStanding && p2.isStanding) continue;
        if (!p1.isStanding && !p2.isStanding) continue;

        const dx = p1.position.x - p2.position.x;
        const dz = p1.position.z - p2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= pinPinThreshold) {
          const movingPin = p1.isStanding ? p2 : p1;
          const standingPin = p1.isStanding ? p1 : p2;

          const vX = movingPin.velocity.x * 0.5;
          const vZ = movingPin.velocity.z * 0.5;
          const vY = Math.abs(vX) * 0.3;

          this.pinManager.knockPin(
            standingPin.id,
            { x: vX, y: vY, z: vZ },
            { x: vZ * 3, y: 0, z: -vX * 3 },
          );

          movingPin.velocity.x *= 0.5;
          movingPin.velocity.z *= 0.5;
        }
      }
    }
  }
}
