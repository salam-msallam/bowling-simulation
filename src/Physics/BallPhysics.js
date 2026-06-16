// ================================================
// BallPhysics.js — نسخة وهمية مؤقتة (Stub)
// عضو 1 رح يستبدل هاد الملف بالفيزياء الحقيقية
// الواجهة (getState / launch / update) لا تتغير
// ================================================

export class BallPhysics {
  constructor() {
    this._pos = { x: 0, y: 0.108, z: 0 }
    this._rot = { x: 0, y: 0, z: 0 }
    this._velocity = 0
    this._angularVelocity = 0
    this.phase = 'idle'       // idle | sliding | rolling | stopped
    this._active = false
  }

  // يُستدعى من main.js عند ضغط Launch
  launch(v0, angle, revRate) {
    this._velocity = v0
    this._angularVelocity = 0
    this._pos = { x: 0, y: 0.108, z: 0 }
    this._rot = { x: 0, y: 0, z: 0 }
    this.phase = 'sliding'
    this._active = true
  }

  // يُستدعى من main.js كل frame
  update(dt) {
    if (!this._active) return

    // حركة وهمية للأمام — عضو 1 يستبدلها بالفيزياء الحقيقية
    this._pos.x += this._velocity * dt
    this._velocity = Math.max(0, this._velocity - 1.5 * dt)
    this._rot.z  += 5 * dt

    if (this._velocity <= 0 || this._pos.x >= 18.5) {
      this.phase   = 'stopped'
      this._active = false
    }
  }

  // الواجهة الرسمية — main.js يقرأ منها فقط
  getState() {
    return {
      position:        { ...this._pos },
      rotation:        { ...this._rot },
      phase:           this.phase,
      velocity:        parseFloat(this._velocity.toFixed(3)),
      angularVelocity: parseFloat(this._angularVelocity.toFixed(3)),
    }
  }

  reset() {
    this._pos    = { x: 0, y: 0.108, z: 0 }
    this._rot    = { x: 0, y: 0, z: 0 }
    this._velocity        = 0
    this._angularVelocity = 0
    this.phase   = 'idle'
    this._active = false
  }
}
