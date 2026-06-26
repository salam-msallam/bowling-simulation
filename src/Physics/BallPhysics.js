// ================================================
// main.js — الحلقة الرئيسية للمحاكاة (النسخة المتوافقة مع محاور الفيزياء)
// المسؤول: العضو 5 + العضو 4
// المهمة: ربط الفيزياء بالرسم والواجهة (lil.gui) بدون أي تعارض محاور
// ================================================

import * as THREE from 'three'

// الاستيراد الصحيح المتوافق مع طريقة تصدير الملفات
import BallPhysics from '/src/Physics/BallPhysics.js'
import { PinPhysics }  from '/src/Physics/PinPhysics.js'

// استيراد شغل العضو 4 (الواجهات والمؤثرات البصرية)
import { DOMInterface } from '/src/ui/DOMInterface.js'
import { BallTrail } from '/src/fx/BallTrail.js'
import { CollisionParticles } from '/src/fx/CollisionParticles.js'

const OIL_PATTERN_END_Z = 12 // تم تحويلها إلى Z لأن الحركة للأمام أصبحت Z
const SETTLE_FRAME_DELAY = 45
const PIN_REST_EPSILON = 0.0005

// ════════════════════════════════════════════════
// 1. إعداد Three.js
// ════════════════════════════════════════════════

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111827)
scene.fog = new THREE.Fog(0x111827, 20, 40)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
// الكاميرا تبدأ من الخلف (Z سلبي وتنظر باتجاه الأماام Z إيجابي)
camera.position.set(0, 1.8, -2)
camera.lookAt(0, 0, 18)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ════════════════════════════════════════════════
// 2. الإضاءة
// ════════════════════════════════════════════════

const ambient = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambient)

const spot = new THREE.SpotLight(0xfff5e0, 2.5)
spot.position.set(0, 7, 9) // تم تعديل الإضاءة لتغطي محور Z
spot.angle       = 0.45
spot.penumbra    = 0.3
spot.castShadow  = true
spot.shadow.mapSize.width  = 1024
spot.shadow.mapSize.height = 1024
spot.target.position.set(0, 0, 9)
scene.add(spot)
scene.add(spot.target)

const fill = new THREE.DirectionalLight(0x6688cc, 0.4)
fill.position.set(3, 4, -5)
scene.add(fill)

// ════════════════════════════════════════════════
// 3. بناء النماذج (تدوير المسار ليتماشى مع محور Z للأمام)
// ════════════════════════════════════════════════

const laneMat = new THREE.MeshStandardMaterial({
  color:     0xc8a96e,
  roughness: 0.75,
  metalness: 0.05,
})
// الأبعاد أصبحت (العرض الجانبي X، السُمك Y، الطول للأمام Z)
const laneMesh = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 18), laneMat)
laneMesh.position.set(0, 0, 9)
laneMesh.receiveShadow = true
scene.add(laneMesh)

const oilMat = new THREE.MeshStandardMaterial({
  color:     0xd4b97a,
  roughness: 0.05,
  metalness: 0.3,
  transparent: true,
  opacity: 0.6,
})
const oilMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.001, 12), oilMat)
oilMesh.position.set(0, 0.026, 6)
scene.add(oilMesh)

const oilEndLineMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  emissive: 0x38bdf8,
  emissiveIntensity: 0.7,
  roughness: 0.25,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
})
const oilEndLineMesh = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.004, 0.035), oilEndLineMat)
oilEndLineMesh.position.set(0, 0.032, OIL_PATTERN_END_Z)
scene.add(oilEndLineMesh)

// الكرة بأبعادها الهندسية الحقيقية المفروضة من الفيزياء
const ballMat = new THREE.MeshStandardMaterial({
  color:     0x1a237e,
  roughness: 0.25,
  metalness: 0.15,
})
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.108, 32, 32), ballMat)
ballMesh.castShadow    = true
ballMesh.receiveShadow = true
scene.add(ballMesh)

const ballTrail = new BallTrail()
ballTrail.addTo(scene)
const collisionParticles = new CollisionParticles(scene)

const pinMat = new THREE.MeshStandardMaterial({
  color:     0xf5f5f5,
  roughness: 0.4,
  metalness: 0.1,
})

const pinGeo  = new THREE.CylinderGeometry(0.032, 0.058, 0.38, 16)
const pinMeshes = Array.from({ length: 10 }, () => {
  const m = new THREE.Mesh(pinGeo, pinMat)
  m.castShadow    = true
  m.receiveShadow = true
  scene.add(m)
  return m
})

const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 40),
  new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 1 })
)
floorMesh.rotation.x = -Math.PI / 2
floorMesh.position.set(0, -0.026, 9)
floorMesh.receiveShadow = true
scene.add(floorMesh)

// ════════════════════════════════════════════════
// 4. تهيئة كلاسات الفيزياء بالبارامترات المطلوبة
// ════════════════════════════════════════════════

const BALL_MASS = 6.0 // كجم
const BALL_RADIUS = 0.108 // متر
const BALL_START_POS = new THREE.Vector3(0, 0.108, 0) // البداية عند حافة المسار Z = 0

const ballPhysics = new BallPhysics(BALL_MASS, BALL_RADIUS, BALL_START_POS)
const pinPhysics  = new PinPhysics()

let lastTime   = performance.now()
let isRunning  = false
let knockDone  = false   
let activeFrameCount = 0
let settleFrameCount = 0
let summaryShown = false
let previousPinStates = null
let currentOilPattern = 'Medium'
let activeTimeouts = []
let knockedPinsTracker = new Array(10).fill(false)

function initScenePositions() {
  const initBall = ballPhysics.getState()
  ballMesh.position.set(initBall.position.x, initBall.position.y, initBall.position.z)
  
  pinPhysics.getStates().forEach((s, i) => {
    // ملاءمة إحداثيات الدبابيس الافتراضية لتعمل على عمق المسار Z
    pinMeshes[i].position.set(s.position.z, s.position.y, s.position.x + 16.5)
    pinMeshes[i].rotation.set(0, 0, 0)
    pinMeshes[i].visible = true
  })
}
initScenePositions()

// ════════════════════════════════════════════════
// 5. المزامنة والكاميرا تتبع المحور Z
// ════════════════════════════════════════════════

function syncBall() {
  const s = ballPhysics.getState()
  ballMesh.position.set(s.position.x, s.position.y, s.position.z)
  
  // تطبيق الدوران المأخوذ كـ Euler من كلاس الفيزياء مباشرة
  ballMesh.rotation.copy(s.rotation)

  if (s.phase !== 'idle') {
    updateFollowCamera(s.position)
  }
}

function syncPins() {
  const states = pinPhysics.getStates()
  states.forEach((s, i) => {
    // تحديث الدبابيس بما يتوافق مع مصفوفة الـ pins والفيزياء الخاصة بها
    if (!knockedPinsTracker[i]) {
      pinMeshes[i].position.set(s.position.z, s.position.y, s.position.x + 16.5)
      pinMeshes[i].rotation.z = s.rotation.z
    }
    pinMeshes[i].visible = s.position.y > -0.08 && !knockedPinsTracker[i]
  })
}

const _camTarget = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()

function updateFollowCamera(ballPos) {
  // تتبع الكرة من الخلف على محور Z
  _camTarget.set(ballPos.x * 0.5, 1.5, ballPos.z - 3)
  camera.position.lerp(_camTarget, 0.04)  
  _lookTarget.set(ballPos.x, ballPos.y, ballPos.z + 2)
  camera.lookAt(_lookTarget)
}

// ════════════════════════════════════════════════
// 6. التصادم والاستقرار
// ════════════════════════════════════════════════

function checkCollisions() {
  if (knockDone) return
  const s = ballPhysics.getState()

  // نهاية المسار عند وصول الكرة لـ Z >= 16.7
  if (s.position.z >= 16.7) {
    knockDone = true
    
    ui.triggerCollisionParticles(s.position, (pos) => {
      collisionParticles.emit(pos)
    })
    
    const delays = [0, 80, 120, 160, 200, 240, 280, 320, 360, 400]
    delays.forEach((delay, i) => {
      const id = setTimeout(() => {
        pinPhysics.knockPin(i)
        knockedPinsTracker[i] = true 
      }, delay)
      activeTimeouts.push(id)
    })
  }
}

function pinStateDelta(a, b) {
  return Math.max(Math.abs(a.position.x - b.position.x), Math.abs(a.position.y - b.position.y))
}

function arePinsAtRest(states) {
  if (!previousPinStates) {
    previousPinStates = states.map(s => ({ position: { ...s.position }, rotation: { ...s.rotation } }))
    return false
  }
  const atRest = states.every((s, i) => pinStateDelta(s, previousPinStates[i]) <= PIN_REST_EPSILON)
  previousPinStates = states.map(s => ({ position: { ...s.position }, rotation: { ...s.rotation } }))
  return atRest
}

function isSimulationSettled() {
  const ball = ballPhysics.getState()
  const pins = pinPhysics.getStates()
  const ballAtRest = ball.phase === 'stopped' || ball.velocity <= 0.01
  return ballAtRest && arePinsAtRest(pins) && settleFrameCount++ >= SETTLE_FRAME_DELAY
}

function showSimulationSummary() {
  if (summaryShown) return
  const ball = ballPhysics.getState()
  summaryShown = true
  isRunning = false
  ui.showSummary({
    pinsKnockedDown: knockedPinsTracker.filter(Boolean).length,
    finalBallVelocity: ball.velocity ? ball.velocity.length() : 0,
    oilPatternName: currentOilPattern,
  })
}

function resetFrameState() {
  isRunning = false
  activeTimeouts.forEach(id => clearTimeout(id))
  activeTimeouts = []
  knockedPinsTracker = new Array(10).fill(false)

  ballPhysics.reset ? ballPhysics.reset() : ballPhysics.position.set(0, 0.108, 0)
  pinPhysics.reset()
  knockDone = false
  activeFrameCount = 0
  settleFrameCount = 0
  summaryShown = false
  previousPinStates = null
  
  initScenePositions()
  ballTrail.clear()
  camera.position.set(0, 1.8, -2)
  camera.lookAt(0, 0, 18)
}

// ════════════════════════════════════════════════
// 7. الحلقة البرمجية لتحديث الاحتكاك والمشهد
// ════════════════════════════════════════════════

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop)

  const dt = Math.min((currentTime - lastTime) / 1000, 0.05)
  lastTime = currentTime

  if (isRunning) {
    activeFrameCount += 1

    let patternEnd = 12
    if (currentOilPattern === 'Short') patternEnd = 9
    if (currentOilPattern === 'Long') patternEnd = 15

    // حساب الـ mu الفعلي بناءً على الإحداثي Z للكرة حالياً واختيار منطقة الزيت
    const currentZ = ballPhysics.position.z
    const currentMu = currentZ <= patternEnd ? 0.05 : 0.20

    // تمرير المتغيرات المطلوبة للفيزياء (dt, mu) في كل إطار ◄
    ballPhysics.update(dt, currentMu)
    pinPhysics.update(dt)

    checkCollisions()
    syncBall()
    syncPins()
    collisionParticles.update(dt)

    if (isSimulationSettled()) {
      showSimulationSummary()
    }
  }

  updateSimulationHUD()

  const ballState = ballPhysics.getState()
  const trailIsEmitting = isRunning && ballState.phase !== 'idle' && ballState.phase !== 'stopped'
  ballTrail.update(dt, ballMesh.position, trailIsEmitting)

  renderer.render(scene, camera)
}

// ════════════════════════════════════════════════
// 8. أحداث واجهة المستخدم
// ════════════════════════════════════════════════

const ui = new DOMInterface()

ui.onLaunch(({ v0, angle, revRate, oilPattern }) => {
  resetFrameState()
  currentOilPattern = oilPattern
  ballPhysics.launch(v0, angle, revRate)
  isRunning = true
})

ui.onReset(() => { resetFrameState() })
ui.onNewFrame(() => { resetFrameState() })

function updateSimulationHUD() {
  const x = ballPhysics.position.x
  const z = ballPhysics.position.z
  let patternEnd = 12
  if (currentOilPattern === 'Short') patternEnd = 9
  if (currentOilPattern === 'Long') patternEnd = 15

  const muK = z <= patternEnd ? 0.05 : 0.20
  const currentV = ballPhysics.velocity ? ballPhysics.velocity.length() : 0
  const currentW = ballPhysics.angularVelocity ? ballPhysics.angularVelocity.length() : 0

  ui.updateHUD(currentV, currentW, ballPhysics.phase, muK, z, activeFrameCount, patternEnd)
}

// البدء الفعلي
requestAnimationFrame(gameLoop)
export default BallPhysics;