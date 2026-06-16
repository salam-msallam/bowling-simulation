import * as THREE from "three";

type BallPhase = "pure_rolling" | "sliding" | "airborne";

class BallPhysics {
  mass: number;
  radius: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  phase: BallPhase;
  private axisTilt: number = 0; // زاوية ميلان المحور (للـ Hook)
  private revRate: number = 0; // عدد دورات اللاعب  يعني كيف اللاعب  يحرك إيده لما يرمي:

  constructor(mass: number, radius: number, position: THREE.Vector3) {
    this.mass = mass;
    this.radius = radius;
    this.position = position.clone(); // clone  منحفظ نسخة مستقلة
    this.velocity = new THREE.Vector3(0, 0, 0); // ساكنة بالبداية
    this.angularVelocity = new THREE.Vector3(0, 0, 0); // ما تدور بالبداية
    this.phase = "sliding"; // تبدأ دايماً بالانزلاق
  }
  //واجهة الإطلاق
  launch(v0: number, angle: number, revRate: number): void {
    this.revRate = revRate;
    this.velocity.set(Math.sin(angle) * v0, 0, Math.cos(angle) * v0);
    this.axisTilt = revRate * 0.08;
    this.phase = "sliding";
  }

  // ═══════════════════════════════
  // الواجهة المتفق عليها مع عضو 5
  // لا يتغير الشكل أبداً!
  // ═══════════════════════════════
  getState(): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    phase: string;
  } {
    // بنحول angularVelocity من Vector3 لـ Euler
    const rotation = new THREE.Euler(
      this.angularVelocity.x, // دوران حول X
      this.angularVelocity.y, // دوران حول Y
      this.angularVelocity.z, // دوران حول Z
    );

    return {
      position: this.position.clone(),
      rotation: rotation,
      phase: this.phase,
    };
  }
  //   a = -μk·g     ←     تباطؤ خطي
  // α = (5·μk·g)/(2·R)  ←     تسارع زاوي

  update(dt: number, mu: number): void {
    const g = 9.81;

    if (this.phase === "sliding") {
      // التباطؤ الخطي: a = -μk·g
      // الكرة بتتباطأ بسبب الاحتكاك
      const a = -mu * g;
      this.velocity.z += a * dt;
      this.velocity.x += a * dt * 0.1;

      // التسارع الزاوي: α = (5·μk·g)/(2·R)
      // الاحتكاك بيخلي الكرة تبدأ تدور

      const alpha = (5 * mu * g) / (2 * this.radius);
      this.angularVelocity.x -= alpha * dt;

      // تحديث الموقع أولاً
      this.position.z += this.velocity.z * dt;
      this.position.x += this.velocity.x * dt;

      // بعدين نتحقق من شرط الانتقال
      const rollingSpeed = Math.abs(this.angularVelocity.x) * this.radius;

      // شرط الانتقال لـ pure_rolling
      // لما v = ω·R ← الكرة بتوقف تنزلق

      if (this.velocity.z > 0 && rollingSpeed >= this.velocity.z) {
        // نثبت ωR = v عند الانتقال
        this.angularVelocity.x = -(this.velocity.z / this.radius);
        this.phase = "pure_rolling";
      }
    } else if (this.phase === "pure_rolling") {
      // بـ pure_rolling ما في انزلاق احتكاك
      // الكرة تكمل بنفس السرعة
      const fs = mu * this.mass * g; //قوة الاحتكاك
      const thook = fs * this.radius * Math.sin(this.axisTilt); //← عزم الانحراف  sin(axisTilt) → كلما زاد revRate، زاد الانحراف
      this.velocity.x += (thook / this.mass) * dt;
      //← الكرة تبدأ تنحرف جانبياً شوي شوي نحو الـ pocket

      // ← هاد السطر الجديد: v بتنخفض بسبب الاحتكاك
      this.velocity.z -= mu * g * 0.01 * dt;
      if (this.velocity.z < 0) this.velocity.z = 0; // ما تصير سالبة
      //velocity.z    = كيف الكرة تتحرك للأمام  (m/s) v
      //angularVelocity.x = كيف الكرة تدور حول نفسها (rad/s) w

      this.angularVelocity.x = -(this.velocity.z / this.radius);

      this.position.z += this.velocity.z * dt;
      this.position.x += this.velocity.x * dt;
    }
  }
}
// fs    = μ · mass · g     ← قوة الاحتكاك الكلية
// thook = fs · R · sin(φ)  ← عزم الانحراف الجانبي
// φ     = axisTilt          ← زاوية ميلان محور الكرة
export default BallPhysics;
// Vector3 = بس 3 أرقام x,y,z — Three.js ما يفهمها مباشرة للدوران
// Euler  = نفس الأرقام بس بترتيب معين — Three.js يفهمها ويطبقها على الـ mesh

// sliding = تنزلق بدون دوران
// pure_rolling = تتدحرج بشكل طبيعي
// airborne = بالهوا
//كلما زاد revRate → زاد axisTilt → زاد sin(φ) → الكرة تنحرف أكتر للجانب

// رمية اللاعب
//     ↓
// [sliding] كرة بتنزلق + بتبدأ تدور شوي شوي
//     ↓  لما v = ωR
// [pure_rolling] كرة بتتدحرج + تنحرف جانبياً (Hook)
//     ↓
// [impact] تضرب الدبابيس
// z → للأمام نحو الدبابيس
// x → يمين ويسار (Hook)
// Euler → كيف الكرة دايرة (للرسم بس)
