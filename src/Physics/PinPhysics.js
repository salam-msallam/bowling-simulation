// ================================================
// PinPhysics.js — نسخة وهمية مؤقتة (Stub)
// عضو 2 رح يستبدل هاد الملف بالفيزياء الحقيقية
// الواجهة (getStates / knockPin / update) لا تتغير
// ================================================

// مواضع الدبابيس العشرة — مثلث البولينغ الحقيقي (بالمتر)
const INIT_POSITIONS = [
  { x: 17.00, z:  0.000 },  // 1  الأمامي
  { x: 17.30, z: -0.150 },  // 2
  { x: 17.30, z:  0.150 },  // 3
  { x: 17.60, z: -0.300 },  // 4
  { x: 17.60, z:  0.000 },  // 5
  { x: 17.60, z:  0.300 },  // 6
  { x: 17.90, z: -0.450 },  // 7
  { x: 17.90, z: -0.150 },  // 8
  { x: 17.90, z:  0.150 },  // 9
  { x: 17.90, z:  0.450 },  // 10
]

export class PinPhysics {
  constructor() {
    this.pins = INIT_POSITIONS.map((p, i) => ({
      id:         i,
      position:   { x: p.x, y: 0.19, z: p.z },
      rotation:   { x: 0, y: 0, z: 0 },
      isStanding: true,
      _fallT:     -1,   // مؤقت السقوط، -1 = لم يسقط
    }))
  }

  // يُستدعى من CollisionManager (عضو 2) أو من main.js مؤقتاً
  knockPin(id) {
    const pin = this.pins[id]
    if (!pin || !pin.isStanding) return
    pin.isStanding = false
    pin._fallT     = 0
  }

  // يُستدعى من main.js كل frame
  update(dt) {
    this.pins.forEach(pin => {
      if (pin._fallT < 0) return
      pin._fallT      += dt
      // دوران تدريجي للسقوط
      pin.rotation.z   = Math.min(Math.PI / 2, pin._fallT * 3.5)
      pin.position.y   = Math.max(-0.05, 0.19 - pin._fallT * 0.4)
    })
  }

  // الواجهة الرسمية — main.js يقرأ منها فقط
  getStates() {
    return this.pins.map(p => ({
      id:         p.id,
      position:   { ...p.position },
      rotation:   { ...p.rotation },
      isStanding: p.isStanding,
    }))
  }

  reset() {
    this.pins.forEach((pin, i) => {
      pin.position   = { x: INIT_POSITIONS[i].x, y: 0.19, z: INIT_POSITIONS[i].z }
      pin.rotation   = { x: 0, y: 0, z: 0 }
      pin.isStanding = true
      pin._fallT     = -1
    })
  }
}
