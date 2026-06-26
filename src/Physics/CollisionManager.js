// ================================================
// CollisionManager.js — النسخة المحدثة
// العضو 2 (فيزياء الدبابيس)
// متوافق تماماً مع كود الكرة (Z للأمام) ونظام الـ OilZone
// ================================================

import * as THREE from "three";

export class CollisionManager {
  /**
   * @param {BallPhysics} ball - كائن الكرة من رفيقتك (عضو 1)
   * @param {PinPhysics} pinManager - كائن إدارة الدبابيس تبعك (عضو 2)
   */
  constructor(ball, pinManager) {
    this.ball = ball;
    this.pinManager = pinManager;
    
    // الأبعاد القياسية بالمتر
    this.ballRadius = 0.108;       // نصف قطر الكرة
    this.pinRadius = 0.06;         // نصف قطر الدبوس
    this.collisionThreshold = this.ballRadius + this.pinRadius; // مسافة التماس (0.168 متر)
  }

  // يُستدعى في الـ main loop كل frame
  checkCollisions() {
    // 1. فحص تصادم الكرة مع الدبابيس الواقفة
    this.pinManager.pins.forEach(pin => {
      if (!pin.isStanding) return;

      // حساب المسافة بين مركز الكرة والدبوس (Z للأمام، X جانبي)
      const dx = this.ball.position.x - pin.position.x;
      const dz = this.ball.position.z - pin.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // إذا حدث تصادم
      if (distance <= this.collisionThreshold) {
        this.handleBallPinCollision(pin, dx, dz);
      }
    });

    // 2. فحص تصادم الدبابيس مع بعضها (تأثير الدومينو)
    this.checkPinToPinCollisions();
  }

  /**
   * معالجة تصادم الكرة مع دبوس
   */
  handleBallPinCollision(pin, dx, dz) {
    const angle = Math.atan2(dx, dz);

    const mBall = this.ball.mass;
    const mPin = this.pinManager.mass;

    // سرعات الكرة قبل التصادم
    const vBallX_init = this.ball.velocity.x;
    const vBallZ_init = this.ball.velocity.z;

    const cr = 0.7; // معامل الارتداد

    // حساب سرعة اندفاع الدبوس بناءً على حفظ الزخم الخطي
    const vPinX = vBallX_init * (1 + cr) * (mBall / (mBall + mPin)) * Math.sin(angle);
    const vPinZ = vBallZ_init * (1 + cr) * (mBall / (mBall + mPin)) * Math.cos(angle);
    const vPinY = Math.sqrt(vPinX * vPinX + vPinZ * vPinZ) * 0.4; // حركة طيران عمودية خفيفة

    // السرعة الزاوية للدبوس
    const vPinAngular = {
      x: vPinZ * 4,
      y: 0,
      z: -vPinX * 4
    };

    // إسقاط الدبوس
    this.pinManager.knockPin(pin.id, { x: vPinX, y: vPinY, z: vPinZ }, vPinAngular);

    // الـ Deflection: رد فعل الصدمة على الكرة (انحرافها وفقدان جزء من سرعتها)
    this.ball.velocity.x = vBallX_init - (mPin / mBall) * vPinX;
    this.ball.velocity.z = vBallZ_init - (mPin / mBall) * vPinZ;
  }

  /**
   * تصادم الدبابيس المتطايرة مع الدبابيس الساكنة
   */
  checkPinToPinCollisions() {
    const pins = this.pinManager.pins;
    const pinPinThreshold = this.pinRadius * 2; // 0.12 متر

    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const p1 = pins[i];
        const p2 = pins[j];

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
            { x: vZ * 3, y: 0, z: -vX * 3 }
          );
          
          movingPin.velocity.x *= 0.5;
          movingPin.velocity.z *= 0.5;
        }
      }
    }
  }
}