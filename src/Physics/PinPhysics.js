// ================================================
// PinPhysics.js — النسخة الفيزيائية الحقيقية الكاملة
// العضو 2 (فيزياء الدبابيس)
// متوافق مع كود الكرة (Z للأمام) وواجهة العضو 5
// ================================================

// مواضع الدبابيس العشرة القياسية متوافقة مع كود الكرة (Z للأمام، X جانبي بالمتر)
const INIT_POSITIONS = [
  { x:  0.000, z: 17.00 },  // 1  الدبوس الأمامي (الرأس)
  { x: -0.150, z: 17.30 },  // 2  الصف الثاني
  { x:  0.150, z: 17.30 },  // 3
  { x: -0.300, z: 17.60 },  // 4  الصف الثالث
  { x:  0.000, z: 17.60 },  // 5
  { x:  0.300, z: 17.60 },  // 6
  { x: -0.450, z: 17.90 },  // 7  الصف الرابع
  { x: -0.150, z: 17.90 },  // 8
  { x:  0.150, z: 17.90 },  // 9
  { x:  0.450, z: 17.90 },  // 10
];

export class PinPhysics {
  constructor() {
    this.mass = 1.53; // الكتلة القياسية للدبوس بالكيلوغرام حسب الدراسة
    
    // بناء الدبابيس بناءً على المصفوفة المتوافقة مع كود الكرة والارتفاع المعتمد عند العضو 5
    this.pins = INIT_POSITIONS.map((p, i) => ({
      id:         i,
      position:   { x: p.x, y: 0.19, z: p.z },
      rotation:   { x: 0, y: 0, z: 0 },
      velocity:   { x: 0, y: 0, z: 0 },         // السرعة الخطية الحقيقية {x, y, z} بعد الصدم
      angularVelocity: { x: 0, y: 0, z: 0 },    // السرعة الزاوية الحقيقية بعد الصدم
      isStanding: true,
    }));
  }

  /**
   * يُستدعى من CollisionManager عند حدوث تصادم حقيقي
   * @param {number} id - رقم الدبوس من 0 إلى 9
   * @param {object} vLinear - السرعة الخطية الناتجة {x, y, z}
   * @param {object} vAngular - السرعة الزاوية الناتجة {x, y, z}
   */
  knockPin(id, vLinear = { x: 0, y: 0, z: 5 }, vAngular = { x: 5, y: 0, z: 0 }) {
    const pin = this.pins[id];
    if (!pin || !pin.isStanding) return;
    
    pin.isStanding = false;
    
    // إسناد السرعات الفيزيائية المحسوبة من لحظة التصادم
    pin.velocity = { ...vLinear };
    pin.angularVelocity = { ...vAngular };
  }

  /**
   * يُستدعى من main.js (العضو 5) كل frame لتحديث الحركة الفيزيائية
   * @param {number} dt - فارق الزمن بين الإطارات
   */
  update(dt) {
    const gravity = 9.81;
    const frictionFloor = 0.2; // معامل الاحتكاك للحركة على الأرضية (تأثير التباطؤ)

    this.pins.forEach(pin => {
      if (pin.isStanding) return; // إذا كان الدبوس واقفاً، لا يتحرك

      // 1. حساب تأثير الجاذبية والاحتكاك على السرعات
      if (pin.position.y > 0.19) {
        // إذا كان الدبوس طائراً في الهواء، تتأثر سرعته العمودية بالجاذبية لأسفل
        pin.velocity.y -= gravity * dt;
      } else {
        // إذا كان على الأرض، نثبته على مستوى المسار ويطبق عليه الاحتكاك لتخفيض السرعة الأفقية
        pin.position.y = 0.19;
        pin.velocity.y = Math.max(0, pin.velocity.y);
        
        // تطبيق التباطؤ الخطي بسبب الاحتكاك مع أرضية الصالة
        pin.velocity.x *= Math.max(0, 1 - frictionFloor * dt * 5);
        pin.velocity.z *= Math.max(0, 1 - frictionFloor * dt * 5);
      }

      // 2. تحديث المواضع (المعادلات الانتقالية: x += v * dt)
      pin.position.x += pin.velocity.x * dt;
      pin.position.y += pin.velocity.y * dt;
      pin.position.z += pin.velocity.z * dt;

      // قيد أمان لمنع اختراق الدبوس لأسفل المسار
      if (pin.position.y < 0.05) {
        pin.position.y = 0.05;
        pin.velocity.y = 0;
      }

      // 3. تحديث الدوران بناءً على السرعة الزاوية (المعادلات الدورانية)
      pin.rotation.x += pin.angularVelocity.x * dt;
      pin.rotation.y += pin.angularVelocity.y * dt;
      pin.rotation.z += pin.angularVelocity.z * dt;
    });
  }

  /**
   * الواجهة الرسمية التي يقرأ منها العضو 5 لتحديث الـ Meshes في Three.js
   */
  getStates() {
    return this.pins.map(p => ({
      id:         p.id,
      position:   { ...p.position },
      rotation:   { ...p.rotation },
      isStanding: p.isStanding,
    }));
  }

  /**
   * إعادة تعيين الدبابيس لمواضعها الأصلية عند بدء رمية جديدة
   */
  reset() {
    this.pins.forEach((pin, i) => {
      pin.position   = { x: INIT_POSITIONS[i].x, y: 0.19, z: INIT_POSITIONS[i].z };
      pin.rotation   = { x: 0, y: 0, z: 0 };
      pin.velocity   = { x: 0, y: 0, z: 0 };
      pin.angularVelocity = { x: 0, y: 0, z: 0 };
      pin.isStanding = true;
    });
  }
}