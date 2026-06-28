import * as THREE from 'three';

// مواضع الدبابيس القياسية: Z باتجاه نهاية المسار، و X يمين/يسار المسار.
const INIT_POSITIONS = [
  { x: 0.000, z: 17.00 },
  { x: -0.150, z: 17.30 },
  { x: 0.150, z: 17.30 },
  { x: -0.300, z: 17.60 },
  { x: 0.000, z: 17.60 },
  { x: 0.300, z: 17.60 },
  { x: -0.450, z: 17.90 },
  { x: -0.150, z: 17.90 },
  { x: 0.150, z: 17.90 },
  { x: 0.450, z: 17.90 },
];

// ثوابت فيزياء الدبوس: ارتفاع الراحة، الجاذبية، نصف القطر التقريبي، ومعاملات التباطؤ.
const PIN_REST_Y = 0.19;
const GRAVITY = 9.81;
const PIN_RADIUS = 0.055;
const MIN_FALL_SPEED = 0.08;
const FALLEN_ANGLE = Math.PI / 2;
const FLOOR_LINEAR_DAMPING = 3.6;
const FLOOR_SPIN_DAMPING = 4.4;
const AIR_SPIN_DAMPING = 0.65;
const TILT_ACCELERATION = 24;
const TILT_DAMPING = 1.35;
const REST_LINEAR_EPSILON = 0.025;
const REST_SPIN_EPSILON = 0.04;

// حاجز خلفي غير مرئي قرب نهاية الـ pit حتى لا تدخل الدبابيس في الحائط الخلفي.
const PIN_BACK_STOP_Z = 18.85;
const BACK_STOP_BOUNCE = 0.16;
const BACK_STOP_DAMPING = 0.42;

// متغيرات مؤقتة يعاد استخدامها كل frame لتقليل إنشاء كائنات جديدة أثناء الحركة.
const _tiltAxis = new THREE.Vector3();
const _tiltQuaternion = new THREE.Quaternion();
const _spinQuaternion = new THREE.Quaternion();
const _rotationEuler = new THREE.Euler();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makePin(index, position) {
  // حالة الدبوس كاملة: موقع، دوران، سرعة خطية، سرعة دوران، وزوايا السقوط.
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
  // نحدد اتجاه سقوط الدبوس من اتجاه الضربة، حتى يميل بصرياً باتجاه الحركة.
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
  // الدبوس يبدأ واقفاً على محور Y؛ نميله حول محور عمودي على اتجاه الحركة حتى يسقط بشكل طبيعي.
  _tiltAxis.set(pin.fallDirection.z, 0, -pin.fallDirection.x).normalize();
  _tiltQuaternion.setFromAxisAngle(_tiltAxis, pin.tiltAngle);
  _spinQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pin.spinAngle);
  _tiltQuaternion.multiply(_spinQuaternion);

  _rotationEuler.setFromQuaternion(_tiltQuaternion, 'XYZ');
  pin.rotation.x = _rotationEuler.x;
  pin.rotation.y = _rotationEuler.y;
  pin.rotation.z = _rotationEuler.z;

  // عند السقوط الأفقي نرفع النموذج قليلاً حتى لا يغوص جسم الدبوس داخل أرضية المسار.
  pin.visualLift = PIN_RADIUS * Math.sin(pin.tiltAngle);
}

function resolveBackStop(pin) {
  // إذا لم يصل الدبوس إلى نهاية الـ pit فلا نغير حركته.
  if (pin.position.z <= PIN_BACK_STOP_Z) return;

  // عند تجاوز الحد نعيده للخلف قليلاً ونخفف طاقته كأنه اصطدم بمصد مطاطي خلف الدبابيس.
  pin.position.z = PIN_BACK_STOP_Z;
  if (pin.velocity.z > 0) {
    pin.velocity.z *= -BACK_STOP_BOUNCE;
  }
  pin.velocity.x *= BACK_STOP_DAMPING;
  pin.spinVelocity *= BACK_STOP_DAMPING;
  pin.tiltVelocity *= BACK_STOP_DAMPING;
}

export class PinPhysics {
  constructor() {
    // الكتلة تستخدم في CollisionManager لحساب انتقال الزخم من الكرة إلى الدبابيس.
    this.mass = 1.53;
    this.pins = INIT_POSITIONS.map((position, index) => makePin(index, position));
  }

  knockPin(id, vLinear = { x: 0, y: 0, z: 5 }, vAngular = { x: 5, y: 0, z: 0 }) {
    // تستدعى عند تصادم الكرة أو دبوس آخر مع دبوس واقف.
    const pin = this.pins[id];
    if (!pin || !pin.isStanding) return;

    const horizontalSpeed = Math.hypot(vLinear.x, vLinear.z);
    const angularKick = Math.hypot(vAngular.x, vAngular.z);
    const directionBias = ((id % 5) - 2) * 0.012;

    // نحول الدبوس من حالة الوقوف إلى حالة الحركة ونخزن طاقة السقوط والدوران.
    pin.isStanding = false;
    pin.isAtRest = false;
    pin.velocity = { ...vLinear };
    pin.angularVelocity = { ...vAngular };
    pin.tiltAngle = 0;
    pin.tiltVelocity = clamp(horizontalSpeed * 2.1 + angularKick * 0.18, 4.5, 12);
    pin.spinAngle = 0;
    pin.spinVelocity = clamp(vLinear.x * 4 + vAngular.y * 0.25, -7, 7);
    pin.targetFallenAngle = FALLEN_ANGLE + directionBias;

    setFallDirection(pin, vLinear, vAngular);
    updatePinRotation(pin);
  }

  update(dt) {
    // تحديث حركة كل دبوس ساقط: جاذبية، احتكاك أرضي، سقوط، دوران، ثم استقرار.
    this.pins.forEach((pin) => {
      if (pin.isStanding || pin.isAtRest) return;

      const isOnFloor = pin.position.y <= PIN_REST_Y && pin.velocity.y <= 0;

      if (isOnFloor) {
        // عند ملامسة الأرض نثبت الارتفاع ونبطئ الحركة الأفقية تدريجياً.
        pin.position.y = PIN_REST_Y;
        pin.velocity.y = 0;

        const linearDampingFactor = Math.max(0, 1 - FLOOR_LINEAR_DAMPING * dt);
        pin.velocity.x *= linearDampingFactor;
        pin.velocity.z *= linearDampingFactor;
      } else {
        // في الهواء يتأثر الدبوس بالجاذبية فقط قبل أن يعود للأرض.
        pin.velocity.y -= GRAVITY * dt;
      }

      // تحديث الموقع من السرعة الحالية، ثم تطبيق حاجز الحائط الخلفي.
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
        // عزم السقوط يزيد الميل تدريجياً، والتخميد يمنع دوراناً مبالغاً فيه بعد أن يصبح الدبوس شبه أفقي.
        const torqueScale = Math.max(0.25, Math.sin(Math.max(pin.tiltAngle, 0.15)));
        pin.tiltVelocity += TILT_ACCELERATION * torqueScale * dt;
        pin.tiltVelocity *= Math.max(0, 1 - TILT_DAMPING * dt);
        pin.tiltAngle = Math.min(pin.targetFallenAngle, pin.tiltAngle + pin.tiltVelocity * dt);
      } else {
        pin.tiltAngle = pin.targetFallenAngle;
        pin.tiltVelocity = 0;
      }

      const spinDamping = isOnFloor ? FLOOR_SPIN_DAMPING : AIR_SPIN_DAMPING;
      // الدوران يتباطأ أسرع على الأرض بسبب الاحتكاك، وأبطأ في الهواء.
      pin.spinVelocity *= Math.max(0, 1 - spinDamping * dt);
      pin.spinAngle += pin.spinVelocity * dt;

      pin.angularVelocity.x = pin.tiltVelocity * pin.fallDirection.z;
      pin.angularVelocity.y = pin.spinVelocity;
      pin.angularVelocity.z = -pin.tiltVelocity * pin.fallDirection.x;

      updatePinRotation(pin);

      const linearSpeed = Math.hypot(pin.velocity.x, pin.velocity.y, pin.velocity.z);
      const tiltSettled = pin.tiltAngle >= pin.targetFallenAngle - 0.001;
      const spinSettled = Math.abs(pin.spinVelocity) < REST_SPIN_EPSILON;

      if (pin.position.y === PIN_REST_Y && tiltSettled && spinSettled && linearSpeed < REST_LINEAR_EPSILON) {
        // عندما تصبح الحركة صغيرة جداً نعتبر الدبوس مستقراً حتى لا يستمر بحسابات صغيرة بلا فائدة.
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
  }

  getStates() {
    // main.js يقرأ نسخة مبسطة فقط من حالة الدبابيس لمزامنة النماذج المرئية.
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
    // إعادة كل دبوس إلى مكانه وحالته الأصلية عند بدء رمية أو إطار جديد.
    this.pins.forEach((pin, index) => {
      Object.assign(pin, makePin(index, INIT_POSITIONS[index]));
    });
  }
}
