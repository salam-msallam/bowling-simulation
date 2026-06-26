import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import BallPhysics from '/src/Physics/BallPhysics.js'
import { PinPhysics } from '/src/Physics/PinPhysics.js'
import { CollisionManager } from '/src/Physics/CollisionManager.js'
import { DOMInterface } from '/src/UI/DOMInterface.js'
import { BallTrail } from '/src/fx/BallTrail.js'
import { CollisionParticles } from '/src/fx/CollisionParticles.js'
import { generateWoodTexture, generateNormalMap } from '/src/textureGenerator.js'

const SETTLE_FRAME_DELAY = 45
const SUMMARY_FALLBACK_FRAME_DELAY = 120
const PIN_REST_EPSILON = 0.0005
const BALL_MASS = 6.0
const BALL_RADIUS = 0.108
const BALL_START_POS = new THREE.Vector3(0, BALL_RADIUS, 0)
const PIN_VISUAL_HEIGHT = 0.38
const LANE_END_Z = 18.5

const renderSettings = {
  bloom: true,
  bloomStrength: 0.38,
  bloomRadius: 0.38,
  bloomThreshold: 0.72,
  exposure: 1.08,
  shadows: true,
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05070d)
scene.fog = new THREE.FogExp2(0x05070d, 0.028)

const CAMERA_MODES = {
  PLAYER: 'player',
  IMPACT: 'impact',
}
function createSceneCamera(fov) {
  return new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 100)
}

const playerCamera = createSceneCamera(55)
const impactCamera = createSceneCamera(58)

// renderCamera is the only camera used by the renderer. It lerps toward the selected mode camera.
const renderCamera = createSceneCamera(55)
renderCamera.position.set(0, 1.8, -2.8)
renderCamera.lookAt(0, 0.18, 9)

let activeCameraMode = CAMERA_MODES.PLAYER
let requestedCameraMode = CAMERA_MODES.PLAYER

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = renderSettings.exposure
renderer.shadowMap.enabled = renderSettings.shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
composer.addPass(new RenderPass(scene, renderCamera))

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  renderSettings.bloomStrength,
  renderSettings.bloomRadius,
  renderSettings.bloomThreshold
)
composer.addPass(bloomPass)

window.addEventListener('resize', () => {
  ;[playerCamera, impactCamera, renderCamera].forEach((camera) => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

function applyEnvironment(texture) {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture
  scene.environment = envMap
  texture.dispose()
}

function applyFallbackEnvironment() {
  const roomEnvironment = new RoomEnvironment()
  const envMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture
  scene.environment = envMap
  roomEnvironment.dispose()
}

function loadEnvironmentMap() {
  const loader = new RGBELoader()
  loader.load(
    '/hdr/bowling_hall_1k.hdr',
    applyEnvironment,
    undefined,
    () => {
      loader.load('/hdr/colorful_studio_2k.hdr', applyEnvironment, undefined, applyFallbackEnvironment)
    }
  )
}

loadEnvironmentMap()

function configureShadowLight(light, size = 1024) {
  light.castShadow = true
  light.shadow.mapSize.set(size, size)
  light.shadow.camera.near = 0.5
  light.shadow.camera.far = 40
  light.shadow.bias = -0.00008
}

const ambient = new THREE.AmbientLight(0x9fb7ff, 0.26)
scene.add(ambient)

const keySpot = new THREE.SpotLight(0xfff2d0, 3.8, 35, 0.48, 0.55, 1.1)
keySpot.position.set(0, 6.2, 8.2)
keySpot.target.position.set(0, 0, 13)
configureShadowLight(keySpot, 2048)
scene.add(keySpot, keySpot.target)

const pinSpot = new THREE.SpotLight(0xffffff, 2.0, 18, 0.55, 0.35, 1.2)
pinSpot.position.set(0, 4.8, 17.5)
pinSpot.target.position.set(0, 0.1, 17.5)
configureShadowLight(pinSpot, 1024)
scene.add(pinSpot, pinSpot.target)

const neonPoint = new THREE.PointLight(0x28d7ff, 1.4, 12, 1.7)
neonPoint.position.set(-2.8, 2.8, 8)
scene.add(neonPoint)

const warmPoint = new THREE.PointLight(0xffb35c, 1.1, 10, 1.8)
warmPoint.position.set(2.8, 2.4, 14)
scene.add(warmPoint)

const woodMap = generateWoodTexture(1024, 256)
woodMap.colorSpace = THREE.SRGBColorSpace
woodMap.wrapS = THREE.RepeatWrapping
woodMap.wrapT = THREE.RepeatWrapping
woodMap.repeat.set(1.15, 8)

const woodNormal = generateNormalMap(512, 512)
woodNormal.wrapS = THREE.RepeatWrapping
woodNormal.wrapT = THREE.RepeatWrapping
woodNormal.repeat.set(1.15, 8)

function createLaneBoardLines() {
  const group = new THREE.Group()
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a321f,
    roughness: 0.42,
    metalness: 0,
    transparent: true,
    opacity: 0.26,
  })

  for (let i = -5; i <= 5; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 18), lineMaterial)
    line.position.set(i * 0.09, 0.036, 9)
    group.add(line)
  }

  const foulLine = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.006, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x222222, roughness: 0.25 })
  )
  foulLine.position.set(0, 0.04, 0.26)
  group.add(foulLine)

  return group
}

function createCinematicLane() {
  const group = new THREE.Group()
  group.name = 'CinematicLane'

  const lane = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.06, 18),
    new THREE.MeshPhysicalMaterial({
      map: woodMap,
      normalMap: woodNormal,
      color: 0xd3a76b,
      roughness: 0.18,
      metalness: 0.03,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.4,
    })
  )
  lane.position.set(0, 0, 9)
  lane.receiveShadow = true
  group.add(lane)

  const oilSheen = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.004, 12),
    new THREE.MeshPhysicalMaterial({
      color: 0xe7c987,
      roughness: 0.035,
      metalness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.34,
      envMapIntensity: 2.2,
    })
  )
  oilSheen.position.set(0, 0.036, 6)
  group.add(oilSheen)

  const dryZone = new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 0.005, 5.8),
    new THREE.MeshStandardMaterial({
      color: 0xb88755,
      roughness: 0.62,
      metalness: 0.02,
      transparent: true,
      opacity: 0.22,
    })
  )
  dryZone.position.set(0, 0.038, 15.1)
  group.add(dryZone)

  const gutterMaterial = new THREE.MeshStandardMaterial({
    color: 0x19120e,
    roughness: 0.35,
    metalness: 0.45,
    envMapIntensity: 0.8,
  })

  ;[-0.68, 0.68].forEach((x) => {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 18.4), gutterMaterial)
    gutter.position.set(x, -0.015, 9.1)
    gutter.receiveShadow = true
    group.add(gutter)
  })

  const approach = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.05, 2.7),
    new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.74, metalness: 0.12 })
  )
  approach.position.set(0, -0.006, -1.35)
  approach.receiveShadow = true
  group.add(approach)

  group.add(createLaneBoardLines())
  return group
}

function createScoreScreens() {
  const group = new THREE.Group()
  group.name = 'ScoreScreens'

  for (let i = -1; i <= 1; i += 1) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.62, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.28, metalness: 0.55 })
    )
    frame.position.set(i * 1.35, 2.75, 19.25)

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.5, 0.012),
      new THREE.MeshStandardMaterial({
        color: 0x071c34,
        emissive: 0x0c77ff,
        emissiveIntensity: 0.55,
        roughness: 0.18,
        metalness: 0.1,
      })
    )
    screen.position.set(i * 1.35, 2.75, 19.225)
    group.add(frame, screen)
  }

  return group
}

function createBallReturn() {
  const group = new THREE.Group()
  group.name = 'BallReturn'

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.32, metalness: 0.7 })
  const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.35 })

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 2.4), coverMaterial)
  base.position.set(1.5, 0.14, 1.25)
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  ;[-0.12, 0.12].forEach((xOffset) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.65, 16), railMaterial)
    rail.rotation.x = Math.PI / 2
    rail.position.set(1.5 + xOffset, 0.36, 1.25)
    rail.castShadow = true
    group.add(rail)
  })

  const colors = [0x7c3aed, 0x0ea5e9, 0xef4444]
  colors.forEach((color, index) => {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.18,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.4,
      })
    )
    ball.position.set(1.5, 0.5, 0.62 + index * 0.36)
    ball.castShadow = true
    group.add(ball)
  })

  return group
}

function createCinematicHall() {
  const group = new THREE.Group()
  group.name = 'CinematicBowlingHall'

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0x090c13,
      roughness: 0.2,
      metalness: 0.35,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.2,
    })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -0.045, 9)
  floor.receiveShadow = true
  group.add(floor)

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.55, metalness: 0.08 })
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, 0.12), wallMaterial)
  backWall.position.set(0, 1.65, 20.15)
  group.add(backWall)

  ;[-4.1, 4.1].forEach((x) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 24), wallMaterial)
    wall.position.set(x, 1.55, 8)
    group.add(wall)
  })

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(8.3, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.62, metalness: 0.18 })
  )
  ceiling.position.set(0, 3.35, 8)
  group.add(ceiling)

  const neonMaterial = new THREE.MeshStandardMaterial({
    color: 0x1fe7ff,
    emissive: 0x1fe7ff,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  })
  for (let z = -1.2; z <= 18; z += 3.2) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.035, 0.04), neonMaterial)
    strip.position.set(0, 3.28, z)
    group.add(strip)
  }

  ;[-1.2, 1.2].forEach((x) => {
    const sideLane = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.035, 18),
      new THREE.MeshStandardMaterial({ color: 0x8b633b, roughness: 0.42, metalness: 0.04 })
    )
    sideLane.position.set(x * 1.55, -0.006, 9)
    sideLane.receiveShadow = true
    group.add(sideLane)
  })

  group.add(createScoreScreens())
  group.add(createBallReturn())
  return group
}

const hallGroup = createCinematicHall()
scene.add(hallGroup)

const laneGroup = createCinematicLane()
scene.add(laneGroup)

const oilEndLineMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.08, 0.004, 0.035),
  new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
)
oilEndLineMesh.position.set(0, 0.048, 12)
scene.add(oilEndLineMesh)

function setObjectShadows(object, cast = true, receive = true) {
  object.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = cast
    child.receiveShadow = receive
    if (child.material) {
      child.material.envMapIntensity = child.material.envMapIntensity ?? 1.0
      child.material.needsUpdate = true
    }
  })
}

function normalizeModelToHeight(object, targetHeight) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetHeight / Math.max(size.y, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
  object.position.y -= scaledBox.min.y - center.y
}

function normalizeBallModel(object, targetDiameter) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetDiameter / Math.max(size.x, size.y, size.z, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
}

function enhanceBallMaterial(object) {
  object.traverse((child) => {
    if (!child.isMesh) return
    child.material = new THREE.MeshPhysicalMaterial({
      color: 0x172a7a,
      roughness: 0.12,
      metalness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
    })
  })
}

function createFallbackBall() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 48, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x172a7a,
      roughness: 0.12,
      metalness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
    })
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function createFallbackPin() {
  const group = new THREE.Group()
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.03,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.0,
  })
  const red = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.02 })

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 24), white)
  body.position.y = 0.17
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.11, 24), white)
  neck.position.y = 0.3
  const stripeA = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 8, 32), red)
  stripeA.position.y = 0.312
  stripeA.rotation.x = Math.PI / 2
  const stripeB = stripeA.clone()
  stripeB.position.y = 0.335

  group.add(body, neck, stripeA, stripeB)
  setObjectShadows(group)
  return group
}

const gltfLoader = new GLTFLoader()

const ballMesh = new THREE.Group()
ballMesh.name = 'PhysicsSyncedBall'
const ballVisualRoot = new THREE.Group()
ballVisualRoot.name = 'BallVisualRoot'
ballVisualRoot.add(createFallbackBall())
ballMesh.add(ballVisualRoot)
scene.add(ballMesh)

function loadBallModel() {
  gltfLoader.load(
    '/Models/PM_Baked_BowlingBall_5-17-22_03.glb',
    (gltf) => {
      ballVisualRoot.clear()
      const model = gltf.scene
      normalizeBallModel(model, BALL_RADIUS * 2)
      enhanceBallMaterial(model)
      setObjectShadows(model)
      ballVisualRoot.add(model)
    },
    undefined,
    () => {}
  )
}

function loadPinModel(pinGroups) {
  gltfLoader.load(
    '/Models/Bowling Pin.glb',
    (gltf) => {
      const template = gltf.scene
      normalizeModelToHeight(template, PIN_VISUAL_HEIGHT)
      setObjectShadows(template)

      pinGroups.forEach((group) => {
        group.clear()
        group.add(template.clone(true))
      })
    },
    undefined,
    () => {}
  )
}

loadBallModel()

const ballTrail = new BallTrail()
ballTrail.addTo(scene)
const collisionParticles = new CollisionParticles(scene)

const pinMeshes = Array.from({ length: 10 }, () => {
  const group = createFallbackPin()
  scene.add(group)
  return group
})
loadPinModel(pinMeshes)

const ballPhysics = new BallPhysics(BALL_MASS, BALL_RADIUS, BALL_START_POS)
const pinPhysics = new PinPhysics()
// CollisionManager links ball physics with pin physics; rendering only reads the resulting state.
const collisionManager = new CollisionManager(ballPhysics, pinPhysics)

let lastTime = performance.now()
let isRunning = false
let activeFrameCount = 0
let settleFrameCount = 0
let summaryFallbackFrameCount = 0
let summaryShown = false
let previousPinStates = null
let currentOilPattern = 'Medium'
let knockedPinsTracker = new Array(10).fill(false)

function getOilPatternEnd() {
  if (currentOilPattern === 'Short') return 9
  if (currentOilPattern === 'Long') return 15
  return 12
}

function getCurrentFriction(z) {
  // main only chooses the oil-zone friction value; the ball class still owns motion physics.
  return z <= getOilPatternEnd() ? 0.05 : 0.20
}

function initScenePositions() {
  syncBall()
  syncPins()
}

function syncBall() {
  // Physics to rendering: copy the ball state onto the visible group.
  const state = ballPhysics.getState()
  ballMesh.position.set(state.position.x, BALL_RADIUS, state.position.z)
  ballVisualRoot.rotation.copy(state.rotation)
}

function syncPins() {
  // Each pin group follows the state with the same index from PinPhysics.
  pinPhysics.getStates().forEach((state, index) => {
    const mesh = pinMeshes[index]
    const visualY = Math.max(0, state.position.y - 0.19)
    mesh.position.set(state.position.x, visualY, state.position.z)
    mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z)
    mesh.visible = state.position.y > -0.08
  })
}

const _camTarget = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()

function setCameraMode(mode) {
  if (!Object.values(CAMERA_MODES).includes(mode)) return
  // Camera switching is manual: 1 player, 3 impact.
  requestedCameraMode = mode
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  // 1/3 switch camera modes while the simulation is running.
  if (event.key === '1') setCameraMode(CAMERA_MODES.PLAYER)
  if (event.key === '3') setCameraMode(CAMERA_MODES.IMPACT)
}, true)

function updatePlayerCamera(ballPos) {
  // Player view follows from behind the ball, but only lightly follows X so hook remains visible.
  _camTarget.set(ballPos.x * 0.18, 1.35, ballPos.z - 3.35)
  playerCamera.position.lerp(_camTarget, 0.12)
  _lookTarget.set(ballPos.x, ballPos.y + 0.08, ballPos.z + 2.7)
  playerCamera.lookAt(_lookTarget)
}

function updateImpactCamera(ballPos) {
  // Impact view is well behind the pins and higher, looking back at the ball entering the rack.
  impactCamera.position.set(0, 2.35, 19.15)
  impactCamera.up.set(0, 1, 0)
  impactCamera.lookAt(ballPos.x * 0.3, 0.38, Math.min(ballPos.z, 17.2))
}

function updateCameraSystem(dt, ballState) {
  const ballPos = new THREE.Vector3(ballState.position.x, BALL_RADIUS, ballState.position.z)

  activeCameraMode = requestedCameraMode

  // Each mode camera is updated first; renderCamera then eases toward whichever mode is active.
  updatePlayerCamera(ballPos)
  updateImpactCamera(ballPos)

  const sourceCamera =
    activeCameraMode === CAMERA_MODES.IMPACT
      ? impactCamera
      : playerCamera

  // Smooth transition: position lerp + quaternion slerp prevents abrupt cuts between views.
  const transitionAlpha = 1 - Math.exp(-dt * 5.5)
  renderCamera.position.lerp(sourceCamera.position, transitionAlpha)
  renderCamera.quaternion.slerp(sourceCamera.quaternion, transitionAlpha)
  renderCamera.fov = THREE.MathUtils.lerp(renderCamera.fov, sourceCamera.fov, transitionAlpha)
  renderCamera.updateProjectionMatrix()
}

function checkCollisions() {
  // CollisionManager mutates physics state; main then emits visual particles for new hits.
  const beforeStates = pinPhysics.getStates()
  collisionManager.checkCollisions()
  const afterStates = pinPhysics.getStates()

  afterStates.forEach((state, index) => {
    if (beforeStates[index]?.isStanding && !state.isStanding) {
      knockedPinsTracker[index] = true
      collisionParticles.emit(new THREE.Vector3(state.position.x, state.position.y, state.position.z))
    }
  })
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
    previousPinStates = states.map((state) => ({
      position: { ...state.position },
      rotation: { ...state.rotation },
    }))
    return false
  }

  const atRest = states.every((state, index) => pinStateDelta(state, previousPinStates[index]) <= PIN_REST_EPSILON)
  previousPinStates = states.map((state) => ({
    position: { ...state.position },
    rotation: { ...state.rotation },
  }))
  return atRest
}

function isSimulationSettled() {
  const ball = ballPhysics.getState()
  const pins = pinPhysics.getStates()
  const ballAtRest = ball.phase === 'stopped' || ball.speed <= 0.01
  const pinsAtRest = arePinsAtRest(pins)
  const reachedEnd = ball.position.z >= LANE_END_Z - 0.05

  if (ballAtRest && pinsAtRest) {
    settleFrameCount += 1
  } else {
    settleFrameCount = 0
  }

  if (ballAtRest || reachedEnd) {
    summaryFallbackFrameCount += 1
  } else {
    summaryFallbackFrameCount = 0
  }

  return (
    (ballAtRest && pinsAtRest && settleFrameCount >= SETTLE_FRAME_DELAY) ||
    summaryFallbackFrameCount >= SUMMARY_FALLBACK_FRAME_DELAY
  )
}

function showSimulationSummary() {
  if (summaryShown) return

  summaryShown = true
  isRunning = false

  ui.showSummary({
    pinsKnockedDown: pinPhysics.getStates().filter((state) => !state.isStanding).length,
    finalBallVelocity: ballPhysics.getState().speed,
    oilPatternName: currentOilPattern,
  })
}

function resetFrameState() {
  isRunning = false
  knockedPinsTracker = new Array(10).fill(false)
  // Reset physics first, then sync visuals to the same state.
  ballPhysics.reset()
  pinPhysics.reset()
  activeFrameCount = 0
  settleFrameCount = 0
  summaryFallbackFrameCount = 0
  summaryShown = false
  previousPinStates = null

  initScenePositions()
  ballTrail.clear()
  setCameraMode(CAMERA_MODES.PLAYER)
  renderCamera.position.set(0, 1.8, -2.8)
  renderCamera.lookAt(0, 0.18, 9)
}

function applyRenderSettings(settings = renderSettings) {
  Object.assign(renderSettings, settings)
  renderer.toneMappingExposure = renderSettings.exposure
  renderer.shadowMap.enabled = renderSettings.shadows
  bloomPass.enabled = renderSettings.bloom
  bloomPass.strength = renderSettings.bloomStrength
  bloomPass.radius = renderSettings.bloomRadius
  bloomPass.threshold = renderSettings.bloomThreshold
}

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop)

  const dt = Math.min((currentTime - lastTime) / 1000, 0.05)
  lastTime = currentTime

  if (isRunning) {
    activeFrameCount += 1

    // Frame order: physics update, collision, then mesh synchronization.
    const ballStateBeforeUpdate = ballPhysics.getState()
    const currentMu = getCurrentFriction(ballStateBeforeUpdate.position.z)

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
  updateCameraSystem(dt, ballState)
  const trailIsEmitting = isRunning && ballState.phase !== 'idle' && ballState.phase !== 'stopped'
  ballTrail.update(dt, ballMesh.position, trailIsEmitting)

  if (renderSettings.bloom) {
    composer.render()
  } else {
    renderer.render(scene, renderCamera)
  }
}

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

const ui = new DOMInterface(renderSettings)

ui.onLaunch(({ v0, angle, revRate, oilPattern }) => {
  launchBall(v0, angle, revRate, oilPattern)
})

ui.onReset(() => {
  resetSimulation()
})

ui.onNewFrame(() => {
  newFrame()
})

if (ui.onRenderSettingsChange) {
  ui.onRenderSettingsChange(applyRenderSettings)
}

if (ui.onCameraModeChange) {
  ui.onCameraModeChange(setCameraMode)
}

function updateSimulationHUD() {
  const ball = ballPhysics.getState()
  const z = ball.position.z
  const patternEnd = getOilPatternEnd()
  const muK = getCurrentFriction(z)

  ui.updateHUD(ball.speed, ball.angularSpeed, ball.phase, muK, z, activeFrameCount, patternEnd)
}

applyRenderSettings()
initScenePositions()
requestAnimationFrame(gameLoop)
