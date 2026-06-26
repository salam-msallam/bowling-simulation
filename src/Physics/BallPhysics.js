import * as THREE from "three";

class BallPhysics {
  constructor(mass, radius, position) {
    this.mass = mass;
    this.radius = radius;
    this.position = position.clone(); // clone منحفظ نسخة مستقلة
    this.velocity = new THREE.Vector3(0, 0, 0); // ساكنة بالبداية
    this.angularVelocity = new THREE.Vector3(0, 0, 0); // ما تدور بالبداية
    this.phase = "sliding"; // تبدأ دايماً بالانزلاق
    this.axisTilt = 0; // زاوية ميلان المحور (للـ Hook)
    this.revRate = 0; // عدد دورات اللاعب
  }

  // واجهة الإطلاق
  launch(v0, angle, revRate) {
    this.revRate = revRate;
    this.velocity.set(Math.sin(angle) * v0, 0, Math.cos(angle) * v0);
    this.axisTilt = revRate * 0.08;
    this.phase = "sliding";
  }

  // الواجهة المتفق عليها مع عضو 5
  // لا يتغير الشكل أبداً!
  getState() {
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

  // a = -μk·g     ←     تباطؤ خطي
  // α = (5·μk·g)/(2·R)  ←     تسارع زاوي
  update(dt, mu) {
    const g = 9.81;

    if (this.phase === "sliding") {
      // التباطؤ الخطي: a = -μk·g
      const a = -mu * g;
      this.velocity.z += a * dt;
      this.velocity.x += a * dt * 0.1;

      // التسارع الزاوي: α = (5·μk·g)/(2·R)
      const alpha = (5 * mu * g) / (2 * this.radius);
      this.angularVelocity.x -= alpha * dt;

      // تحديث الموقع أولاً
      this.position.z += this.velocity.z * dt;
      this.position.x += this.velocity.x * dt;

      // شرط الانتقال لـ pure_rolling
      // لما v = ω·R ← الكرة بتوقف تنزلق
      const rollingSpeed = Math.abs(this.angularVelocity.x) * this.radius;
      if (this.velocity.z > 0 && rollingSpeed >= this.velocity.z) {
        this.angularVelocity.x = -(this.velocity.z / this.radius);
        this.phase = "pure_rolling";
      }
    } else if (this.phase === "pure_rolling") {
      const fs = mu * this.mass * g; // قوة الاحتكاك
      const thook = fs * this.radius * Math.sin(this.axisTilt); // عزم الانحراف
      this.velocity.x += (thook / this.mass) * dt;
      // الكرة تبدأ تنحرف جانبياً شوي شوي نحو الـ pocket

      // v بتنخفض بسبب الاحتكاك
      this.velocity.z -= mu * g * 0.01 * dt;
      if (this.velocity.z < 0) this.velocity.z = 0; // ما تصير سالبة

      this.angularVelocity.x = -(this.velocity.z / this.radius);

      this.position.z += this.velocity.z * dt;
      this.position.x += this.velocity.x * dt;
    }
  }
  reset() {
  this.velocity.set(0, 0, 0);
  this.angularVelocity.set(0, 0, 0);
  this.phase = "sliding";
  this.axisTilt = 0;
  this.revRate = 0;
  }
}

export default BallPhysics;

// Vector3 = بس 3 أرقام x,y,z — Three.js ما يفهمها مباشرة للدوران
// Euler  = نفس الأرقام بس بترتيب معين — Three.js يفهمها ويطبقها على الـ mesh
// sliding = تنزلق بدون دوران
// pure_rolling = تتدحرج بشكل طبيعي
// airborne = بالهوا
// z → للأمام نحو الدبابيس
// x → يمين ويسار (Hook)
