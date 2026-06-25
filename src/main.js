// ================================================
// main.js — الحلقة الرئيسية للمحاكاة
// المسؤول: العضو 5
// المهمة: ربط الفيزياء بالرسم في كل frame
// ================================================

import * as THREE from 'three'
import { BallPhysics } from '/src/Physics/BallPhysics.js'
import { PinPhysics }  from '/src/Physics/PinPhysics.js'

// استيراد شغل العضو 4 (الواجهات والمؤثرات) من الملفات المستقلة ◄
import { DOMInterface } from '/src/ui/DOMInterface.js'
import { BallTrail } from '/src/fx/BallTrail.js'
import { CollisionParticles } from '/src/fx/CollisionParticles.js'

const OIL_PATTERN_END_X = 12
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
camera.position.set(-2, 1.8, 0)
camera.lookAt(18, 0, 0)

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
spot.position.set(9, 7, 0)
spot.angle       = 0.45
spot.penumbra    = 0.3
spot.castShadow  = true
spot.shadow.mapSize.width  = 1024
spot.shadow.mapSize.height = 1024
spot.target.position.set(9, 0, 0)
scene.add(spot)
scene.add(spot.target)

const fill = new THREE.DirectionalLight(0x6688cc, 0.4)
fill.position.set(-5, 4, 3)
scene.add(fill)


// ════════════════════════════════════════════════
// 3. بناء المشهد (مؤقت — عضو 3 يطور هاد لاحقاً)
// ════════════════════════════════════════════════

const laneMat = new THREE.MeshStandardMaterial({
  color:     0xc8a96e,
  roughness: 0.75,
  metalness: 0.05,
})
const laneMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 1.05), laneMat)
laneMesh.position.set(9, 0, 0)
laneMesh.receiveShadow = true
scene.add(laneMesh)

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

const oilEndLineMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  emissive: 0x38bdf8,
  emissiveIntensity: 0.7,
  roughness: 0.25,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
})
const oilEndLineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 1.08), oilEndLineMat)
oilEndLineMesh.position.set(OIL_PATTERN_END_X, 0.032, 0)
scene.add(oilEndLineMesh)

const ballMat = new THREE.MeshStandardMaterial({
  color:     0x1a237e,
  roughness: 0.25,
  metalness: 0.15,
})
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.108, 32, 32), ballMat)
ballMesh.castShadow    = true
ballMesh.receiveShadow = true
scene.add(ballMesh)

// استدعاء الـ Trail الخاص بك ◄
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
  new THREE.PlaneGeometry(40, 20),
  new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 1 })
)
floorMesh.rotation.x = -Math.PI / 2
floorMesh.position.set(9, -0.026, 0)
floorMesh.receiveShadow = true
scene.add(floorMesh)


// ════════════════════════════════════════════════
// 4. كلاسات الفيزياء
// ════════════════════════════════════════════════

const ballPhysics = new BallPhysics()
const pinPhysics  = new PinPhysics()

pinPhysics.getStates().forEach((s, i) => {
  pinMeshes[i].position.set(s.position.x, s.position.y, s.position.z)
})

const initBall = ballPhysics.getState()
ballMesh.position.set(initBall.position.x, initBall.position.y, initBall.position.z)


// ════════════════════════════════════════════════
// 5. متغيرات التحكم
// ════════════════════════════════════════════════

let lastTime   = performance.now()
let isRunning  = false
let knockDone  = false   
let activeFrameCount = 0
let settleFrameCount = 0
let summaryShown = false
let previousPinStates = null
let currentOilPattern = 'Medium'
let activeTimeouts = []

// التتبع المحلي لضمان عداد الرمية 10/10 ◄
let knockedPinsTracker = new Array(10).fill(false)


// ════════════════════════════════════════════════
// 6. دوال الربط: الفيزياء → النماذج
// ════════════════════════════════════════════════

function syncBall() {
  const s = ballPhysics.getState()

  ballMesh.position.set(s.position.x, s.position.y, s.position.z)
  ballMesh.rotation.z = s.rotation.z    
  ballMesh.rotation.x = s.rotation.x   

  if (s.phase !== 'idle') {
    updateFollowCamera(s.position)
  }
}

function syncPins() {
  const states = pinPhysics.getStates()
  states.forEach((s, i) => {
    pinMeshes[i].position.set(s.position.x, s.position.y, s.position.z)
    pinMeshes[i].rotation.z = s.rotation.z
    pinMeshes[i].visible = s.position.y > -0.08 && !knockedPinsTracker[i]
  })
}


// ════════════════════════════════════════════════
// 7. كاميرا المتابعة
// ════════════════════════════════════════════════

const _camTarget = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()

function updateFollowCamera(ballPos) {
  _camTarget.set(ballPos.x - 3, 1.5, ballPos.z * 0.5)
  camera.position.lerp(_camTarget, 0.04)  

  _lookTarget.set(ballPos.x + 2, ballPos.y, ballPos.z)
  camera.lookAt(_lookTarget)
}


// ════════════════════════════════════════════════
// 8. كشف التصادم والمزامنة
// ════════════════════════════════════════════════

function checkCollisions() {
  if (knockDone) return
  const s = ballPhysics.getState()

  if (s.position.x >= 16.7) {
    knockDone = true
    collisionParticles.emit(s.position)
    
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
  return Math.max(
    Math.abs(a.position.x - b.position.x),
    Math.abs(a.position.y - b.position.y),
    Math.abs(a.position.z - b.position.z),
    Math.abs(a.rotation.x - b.rotation.x),
    Math.abs(a.rotation.y - b.rotation.y),
    Math.abs(a.rotation.z - b.rotation.z)
  )
}

function arePinsAtRest(states) {
  if (!previousPinStates) {
    previousPinStates = states.map(s => ({
      position: { ...s.position },
      rotation: { ...s.rotation },
    }))
    return false
  }

  const atRest = states.every((s, i) => pinStateDelta(s, previousPinStates[i]) <= PIN_REST_EPSILON)
  previousPinStates = states.map(s => ({
    position: { ...s.position },
    rotation: { ...s.rotation },
  }))
  return atRest
}

function isSimulationSettled() {
  const ball = ballPhysics.getState()
  const pins = pinPhysics.getStates()
  
  const ballAtRest = ball.phase === 'stopped' || ball.velocity <= 0.01
  const pinsAtRest = arePinsAtRest(pins)

  if (ballAtRest && pinsAtRest) {
    settleFrameCount += 1
  } else {
    settleFrameCount = 0
  }

  return ballAtRest && pinsAtRest && settleFrameCount >= SETTLE_FRAME_DELAY
}

function countKnockedPins() {
  return knockedPinsTracker.filter(Boolean).length
}

function showSimulationSummary() {
  if (summaryShown) return

  const ball = ballPhysics.getState()
  summaryShown = true
  isRunning = false
  ui.showSummary({
    pinsKnockedDown: countKnockedPins(),
    finalBallVelocity: ball.velocity,
    oilPatternName: currentOilPattern,
  })
}

function resetFrameState({ hideSummary = true } = {}) {
  isRunning = false
  
  activeTimeouts.forEach(id => clearTimeout(id))
  activeTimeouts = []
  knockedPinsTracker = new Array(10).fill(false)

  ballPhysics.reset()
  pinPhysics.reset()
  knockDone = false
  activeFrameCount = 0
  settleFrameCount = 0
  summaryShown = false
  previousPinStates = null
  syncBall()
  syncPins()
  ballTrail.clear()
  camera.position.set(-2, 1.8, 0)
  camera.lookAt(18, 0, 0)

  if (hideSummary) {
    ui.hideSummary()
  }
}


// ════════════════════════════════════════════════
// 9. الحلقة الرئيسية
// ════════════════════════════════════════════════

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop)

  const dt = Math.min((currentTime - lastTime) / 1000, 0.05)
  lastTime  = currentTime

  if (isRunning) {
    activeFrameCount += 1

    ballPhysics.update(dt)
    pinPhysics.update(dt)

    checkCollisions()

    syncBall()
    syncPins()
    collisionParticles.update(dt)

    if (isSimulationSettled()) {
      showSimulationSummary()
    }
  }

  const ballState = ballPhysics.getState()
  const trailIsEmitting = isRunning && ballState.phase !== 'idle' && ballState.phase !== 'stopped'
  ballTrail.update(dt, ballMesh.position, trailIsEmitting)

  renderer.render(scene, camera)
}


// ════════════════════════════════════════════════
// 10. دوال التحكم (تُستدعى من الواجهة)
// ════════════════════════════════════════════════

export function launchBall(v0, angle, revRate, oilPattern = 'Medium') {
  resetFrameState()
  currentOilPattern = oilPattern

  ballPhysics.launch(v0, angle, revRate)
  isRunning = true
}

export function stopSimulation() {
  isRunning = false
}

export function resetSimulation() {
  currentOilPattern = 'Medium'
  resetFrameState()
}

export function newFrame() {
  resetFrameState()
}

export function getPhysicsState() {
  return {
    ball: ballPhysics.getState(),
    pins: pinPhysics.getStates(),
  }
}


// ════════════════════════════════════════════════
// 12. تشغيل النظام وربط الأحداث
// ════════════════════════════════════════════════

const ui = new DOMInterface()

ui.onLaunch(({ v0, angle, revRate, oilPattern }) => {
  launchBall(v0, angle, revRate, oilPattern)
  updateSimulationHUD()
})

ui.onReset(() => {
  resetSimulation()
  updateSimulationHUD()
})

ui.onNewFrame(() => {
  newFrame()
  updateSimulationHUD()
})

function getKineticFrictionCoefficient(x) {
  return x <= OIL_PATTERN_END_X ? 0.05 : 0.20
}

function updateSimulationHUD() {
  const { ball } = getPhysicsState()
  const x = ball.position.x
  const muK = getKineticFrictionCoefficient(x)
  ui.updateHUD(ball.velocity, ball.angularVelocity, ball.phase, muK, x, activeFrameCount, OIL_PATTERN_END_X)
}

setInterval(updateSimulationHUD, 100)

requestAnimationFrame(gameLoop)
