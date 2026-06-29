import * as THREE from 'three'

// ============================================================
// مسؤولية العضو 3: التصادمات
// ركز هنا إذا كنت مسؤولاً عن: متى تضرب الكرة الدبابيس، كيف ينتقل الزخم، وتأثير الدومينو بين الدبابيس.
// الملفات المرتبطة التي يجب فهمها معه: BallPhysics.js لحالة الكرة، وPinPhysics.js لإسقاط الدبابيس وتحديثها.
// ============================================================

export class CollisionManager {
  constructor(ball, pinManager) {
    // يحتفظ بمراجع الفيزياء فقط، ولا ينشئ Mesh أو عناصر مرئية.
    this.ball = ball
    this.pinManager = pinManager

    // أبعاد تقريبية بالمتر تستخدم لحساب مسافة التماس بين الكرة والدبوس.
    this.ballRadius = 0.108
    this.pinRadius = 0.06
    this.collisionThreshold = this.ballRadius + this.pinRadius
  }

  checkCollisions() {
    // يستدعى كل frame من createSimulationController بعد تحديث فيزياء الكرة والدبابيس.
    this.pinManager.pins.forEach((pin) => {
      if (!pin.isStanding) return

      // نحسب المسافة أفقياً فقط لأن التصادم الأساسي يحدث على أرضية المسار بين X و Z.
      const dx = this.ball.position.x - pin.position.x
      const dz = this.ball.position.z - pin.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance <= this.collisionThreshold) {
        this.handleBallPinCollision(pin, dx, dz)
      }
    })

    // بعد تصادم الكرة، نفحص هل دبوس متحرك ضرب دبوساً واقفاً.
    this.checkPinToPinCollisions()
  }

  handleBallPinCollision(pin, dx, dz) {
    // يحول تصادم الكرة مع دبوس إلى سرعة خطية وزاوية للدبوس، ثم يقلل سرعة الكرة.
    const angle = Math.atan2(dx, dz)

    const mBall = this.ball.mass
    const mPin = this.pinManager.mass

    const vBallXInit = this.ball.velocity.x
    const vBallZInit = this.ball.velocity.z

    // معامل الارتداد يحدد مقدار الطاقة التي تبقى بعد التصادم.
    const cr = 0.7

    // نحسب دفعة الدبوس حسب اتجاه التصادم وحفظ الزخم التقريبي.
    const vPinX = vBallXInit * (1 + cr) * (mBall / (mBall + mPin)) * Math.sin(angle)
    const vPinZ = vBallZInit * (1 + cr) * (mBall / (mBall + mPin)) * Math.cos(angle)
    const vPinY = Math.sqrt(vPinX * vPinX + vPinZ * vPinZ) * 0.4

    // السرعة الزاوية تعطي الدبوس ميلاناً ودوراناً بصرياً عند السقوط.
    const vPinAngular = {
      x: vPinZ * 4,
      y: 0,
      z: -vPinX * 4,
    }

    this.pinManager.knockPin(pin.id, { x: vPinX, y: vPinY, z: vPinZ }, vPinAngular)

    // رد فعل التصادم على الكرة: تنحرف وتفقد جزءاً من سرعتها.
    this.ball.velocity.x = vBallXInit - (mPin / mBall) * vPinX
    this.ball.velocity.z = vBallZInit - (mPin / mBall) * vPinZ
  }

  checkPinToPinCollisions() {
    // يفحص كل زوج من الدبابيس لتفعيل تأثير الدومينو بين دبوس متحرك ودبوس واقف.
    const pins = this.pinManager.pins
    const pinPinThreshold = this.pinRadius * 2

    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const p1 = pins[i]
        const p2 = pins[j]

        // لا نحتاج معالجة زوج كلاهما واقف أو كلاهما ساقط.
        if (p1.isStanding && p2.isStanding) continue
        if (!p1.isStanding && !p2.isStanding) continue

        const dx = p1.position.x - p2.position.x
        const dz = p1.position.z - p2.position.z
        const distance = Math.sqrt(dx * dx + dz * dz)

        if (distance <= pinPinThreshold) {
          const movingPin = p1.isStanding ? p2 : p1
          const standingPin = p1.isStanding ? p1 : p2

          // ننقل نصف سرعة الدبوس المتحرك للدبوس الواقف حتى لا يصبح التأثير مبالغاً فيه.
          const vX = movingPin.velocity.x * 0.5
          const vZ = movingPin.velocity.z * 0.5
          const vY = Math.abs(vX) * 0.3

          this.pinManager.knockPin(
            standingPin.id,
            { x: vX, y: vY, z: vZ },
            { x: vZ * 3, y: 0, z: -vX * 3 }
          )

          // بعد نقل جزء من الطاقة نخفف حركة الدبوس المتحرك.
          movingPin.velocity.x *= 0.5
          movingPin.velocity.z *= 0.5
        }
      }
    }
  }
}
