// ================================================
// main.js — الحلقة الرئيسية للمحاكاة
// المسؤول: العضو 5
// المهمة: ربط الفيزياء بالرسم في كل frame
// Day 3-4: Bowling Objects & Lane Integration
// ================================================

import * as THREE from 'three'
import { BallPhysics } from '/src/Physics/BallPhysics.js'
import { PinPhysics }  from '/src/Physics/PinPhysics.js'
import { createBowlingBall, resetBallPosition } from './bowlingBall.js'
import { createPinFormation, resetPinFormation } from './bowlingPin.js'
import { createLaneEnvironment } from './bowlingLane.js'


// ════════════════════════════════════════════════
// 1. إعداد Three.js
// ════════════════════════════════════════════════

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111827)
scene.fog = new THREE.Fog(0x111827, 20, 40)

const camera = new THREE.PerspectiveCamera(
  60,                                   // زاوية الرؤية
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
// الموضع الابتدائي: خلف اللاعب
camera.position.set(-2, 1.8, 0)
camera.lookAt(18, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// تكيف حجم النافذة
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})


// ════════════════════════════════════════════════
// 2. الإضاءة
// ════════════════════════════════════════════════

// إضاءة خافتة للكل
const ambient = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambient)

// بقعة ضوء رئيسية فوق المسار
const spot = new THREE.SpotLight(0xfff5e0, 2.5)
spot.position.set(9, 7, 0)
spot.angle       = 0.45
spot.penumbra    = 0.3
spot.castShadow  = true
spot.shadow.mapSize.width  = 1024
spot.shadow.mapSize.height = 1024
spot.target.position.set(9, 0, 0)
scene.add(spot)
scene.add(spot.target)

// إضاءة ثانوية من الجانب لإبراز العمق
const fill = new THREE.DirectionalLight(0x6688cc, 0.4)
fill.position.set(-5, 4, 3)
scene.add(fill)


// ════════════════════════════════════════════════
// 3. بناء المشهد - Day 3-4: Bowling Objects
// ════════════════════════════════════════════════

// Create bowling lane environment (lane, gutters, approach area)
const laneEnvironment = createLaneEnvironment(scene)

// Create and add bowling ball
const ballMesh = createBowlingBall()
scene.add(ballMesh)

// Create and add 10 bowling pins
const pinMeshes = createPinFormation(scene)

// منطقة الزيت (لامعة — 0 إلى 12 متر)
const oilMat = new THREE.MeshStandardMaterial({
  color:     0xd4b97a,
  roughness: 0.05,
  metalness: 0.3,
  transparent: true,
  opacity: 0.6,
})
const oilMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 0.001, 1.0), oilMat)
oilMesh.position.set(6, 0.026, 0)
scene.add(oilMesh)

// — الأرضية حول المسار —
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 20),
  new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 1 })
)
floorMesh.rotation.x = -Math.PI / 2
floorMesh.position.set(9, -0.026, 0)
floorMesh.receiveShadow = true
scene.add(floorMesh)

console.log('✓ Day 3-4 Scene Objects Initialized:')
console.log('  - Bowling Lane with Gutters & Approach Area')
console.log('  - Bowling Ball (sphere 0.108m radius)')
console.log('  - 10 Bowling Pins (composite geometry)')

// ════════════════════════════════════════════════
// 4. كلاسات الفيزياء
// ════════════════════════════════════════════════

const ballPhysics = new BallPhysics()
const pinPhysics  = new PinPhysics()

// ضبط موضع الكرة الابتدائي
const initBall = ballPhysics.getState()
ballMesh.position.set(initBall.position.x, initBall.position.y, initBall.position.z)


// ════════════════════════════════════════════════
// 5. متغيرات التحكم
// ════════════════════════════════════════════════

let lastTime   = performance.now()
let isRunning  = false
let knockDone  = false   // منع تكرار كشف التصادم المؤقت


// ════════════════════════════════════════════════
// 6. دوال الربط: الفيزياء → النماذج
// هذا هو جوهر مهمة العضو 5
// ════════════════════════════════════════════════

function syncBall() {
  const s = ballPhysics.getState()

  ballMesh.position.set(s.position.x, s.position.y, s.position.z)
  ballMesh.rotation.z = s.rotation.z    // التدحرج حول المحور Z
  ballMesh.rotation.x = s.rotation.x   // التدحرج حول المحور X (Hook)

  if (s.phase !== 'idle') {
    updateFollowCamera(s.position)
  }
}

function syncPins() {
  const states = pinPhysics.getStates()
  states.forEach((s, i) => {
    pinMeshes[i].position.set(s.position.x, s.position.y, s.position.z)
    pinMeshes[i].rotation.z = s.rotation.z
    // اخفِ الدبوس بعد ما يستقر على الأرض تماماً
    pinMeshes[i].visible = s.position.y > -0.08
  })
}


// ════════════════════════════════════════════════
// 7. كاميرا المتابعة
// ════════════════════════════════════════════════

// Vector3 مُعاد استخدامه لتجنب إنشاء objects جديدة كل frame
const _camTarget = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()

function updateFollowCamera(ballPos) {
  // الكاميرا تتبع الكرة من الخلف بمسافة 3 متر وارتفاع 1.5
  _camTarget.set(ballPos.x - 3, 1.5, ballPos.z * 0.5)
  camera.position.lerp(_camTarget, 0.04)  // 0.04 = سلاسة المتابعة

  _lookTarget.set(ballPos.x + 2, ballPos.y, ballPos.z)
  camera.lookAt(_lookTarget)
}


// ════════════════════════════════════════════════
// 8. كشف التصادم المؤقت
// عضو 2 يستبدل هاد بـ CollisionManager الحقيقي
// ════════════════════════════════════════════════

function checkCollisions() {
  if (knockDone) return
  const s = ballPhysics.getState()

  // لما الكرة تقترب من منطقة الدبابيس
  if (s.position.x >= 16.7) {
    knockDone = true
    // مؤقتاً: اسقط كل الدبابيس تباعاً (عضو 2 يحل هاد)
    const delays = [0, 80, 120, 160, 200, 240, 280, 320, 360, 400]
    delays.forEach((delay, i) => {
      setTimeout(() => pinPhysics.knockPin(i), delay)
    })
  }
}


// ════════════════════════════════════════════════
// 9. الحلقة الرئيسية
// ════════════════════════════════════════════════

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop)

  // dt = الزمن بين frame وframe (بالثانية)
  // Math.min يمنع dt كبير لو توقف المتصفح لحظة
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05)
  lastTime  = currentTime

  if (isRunning) {
    // ── خطوة 1: حدّث الفيزياء ──────────────────
    ballPhysics.update(dt)
    pinPhysics.update(dt)

    // ── خطوة 2: كشف التصادم ────────────────────
    checkCollisions()

    // ── خطوة 3: انقل النتائج للنماذج ───────────
    syncBall()
    syncPins()

    // ── خطوة 4: إذا الكرة وقفت أوقف المحاكاة ──
    if (ballPhysics.getState().phase === 'stopped') {
      isRunning = false
    }
  }

  // ── خطوة 5: ارسم المشهد (دائماً، حتى لو واقف)
  renderer.render(scene, camera)
}


// ════════════════════════════════════════════════
// 10. دوال التحكم (تُستدعى من الواجهة)
// عضو 4 يستدعي هالدوال من واجهته
// ════════════════════════════════════════════════

export function launchBall(v0, angle, revRate) {
  // أعد الضبط أولاً
  ballPhysics.reset()
  pinPhysics.reset()
  knockDone = false
  syncBall()
  syncPins()

  // أعد الكاميرا للخلف
  camera.position.set(-2, 1.8, 0)
  camera.lookAt(18, 0, 0)

  // أطلق الكرة
  ballPhysics.launch(v0, angle, revRate)
  isRunning = true
}

export function stopSimulation() {
  isRunning = false
}

export function resetSimulation() {
  isRunning = false
  ballPhysics.reset()
  pinPhysics.reset()
  knockDone = false
  syncBall()
  syncPins()
  camera.position.set(-2, 1.8, 0)
  camera.lookAt(18, 0, 0)
}

export function getPhysicsState() {
  return {
    ball: ballPhysics.getState(),
    pins: pinPhysics.getStates(),
  }
}


// ════════════════════════════════════════════════
// 11. واجهة مؤقتة بسيطة
// عضو 4 يستبدل هاد بواجهته الكاملة
// ════════════════════════════════════════════════

function buildTempUI() {
  // CSS
  const style = document.createElement('style')
  style.textContent = `
    body { margin:0; overflow:hidden; font-family: system-ui, sans-serif; }
    #temp-ui {
      position: fixed; top: 16px; right: 16px;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(6px);
      color: #fff; padding: 16px 18px;
      border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column; gap: 10px;
      min-width: 200px;
    }
    #temp-ui h3 { margin:0 0 4px; font-size:13px; color:#aaa; font-weight:400; }
    #temp-ui button {
      padding: 9px 0; border-radius: 7px; border: none;
      cursor: pointer; font-size: 13px; font-weight: 500;
      transition: opacity .15s;
    }
    #temp-ui button:hover { opacity: 0.85; }
    #btn-launch { background: #2563eb; color: #fff; }
    #btn-stop   { background: #374151; color: #fff; }
    #btn-reset  { background: #1f2937; color: #9ca3af; }
    #hud {
      font-size: 11px; color: #9ca3af;
      line-height: 1.9; border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 8px; margin-top: 2px;
    }
    #hud b { color: #e5e7eb; }
  `
  document.head.appendChild(style)

  // HTML
  const ui = document.createElement('div')
  ui.id = 'temp-ui'
  ui.innerHTML = `
    <h3>🎳 Bowling Simulation</h3>
    <button id="btn-launch">▶ Launch</button>
    <button id="btn-stop">⏹ Stop</button>
    <button id="btn-reset">↺ Reset</button>
    <div id="hud">اضغط Launch للبدء</div>
  `
  document.body.appendChild(ui)

  document.getElementById('btn-launch').onclick = () => launchBall(7.5, 0, 350)
  document.getElementById('btn-stop').onclick   = () => stopSimulation()
  document.getElementById('btn-reset').onclick  = () => resetSimulation()
}

// تحديث HUD كل 100ms (منفصل عن حلقة الرسم لتوفير الأداء)
function startHUDUpdater() {
  setInterval(() => {
    const hud = document.getElementById('hud')
    if (!hud) return
    const { ball } = getPhysicsState()
    hud.innerHTML = `
      Phase: <b>${ball.phase}</b><br>
      Velocity: <b>${ball.velocity.toFixed(2)} m/s</b><br>
      ω: <b>${ball.angularVelocity.toFixed(2)} rad/s</b><br>
      Position X: <b>${ball.position.x.toFixed(2)} m</b>
    `
  }, 100)
}


// ════════════════════════════════════════════════
// 12. تشغيل كل شي
// ════════════════════════════════════════════════

buildTempUI()
// startHUDUpdater()
requestAnimationFrame(gameLoop)
