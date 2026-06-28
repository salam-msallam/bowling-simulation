import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import BallPhysics from '/src/Physics/BallPhysics.js'
import { PinPhysics } from '/src/Physics/PinPhysics.js'
import { CollisionManager } from '/src/Physics/CollisionManager.js'
import { DOMInterface } from '/src/UI/DOMInterface.js'
import { generateWoodTexture, generateNormalMap } from '/src/textureGenerator.js'

// ============================================================
// 1) ثوابت المحاكاة وإعدادات العرض العامة
// هنا نحدد أبعاد الكرة والدبابيس، إعدادات الـ Bloom، وحدود نهاية المسار.
// ============================================================
const SETTLE_FRAME_DELAY = 45
const SUMMARY_FALLBACK_FRAME_DELAY = 120
const PIN_REST_EPSILON = 0.0005
const BALL_MASS = 6.0
const BALL_RADIUS = 0.108
const BALL_START_POS = new THREE.Vector3(0, BALL_RADIUS, 0)
const PIN_VISUAL_HEIGHT = 0.38
const PIN_VISUAL_FLOOR_OFFSET = 0.055
const LANE_END_Z = 18.5
const PIN_FALL_SOUND_COOLDOWN_MS = 140

const SOUND_PATHS = {
  rollingBall: '/sounds/freesound_community-bowling-ball-90863 (1).mp3',
  pinFall: '/sounds/emycutiepants-bowling-strike-339170.mp3',
}

const renderSettings = {
  bloom: true,
  bloomStrength: 0.38,
  bloomRadius: 0.38,
  bloomThreshold: 0.72,
  exposure: 1.08,
  shadows: true,
}

// ============================================================
// 2) إنشاء المشهد والكاميرات والـ Renderer
// هذا القسم مسؤول عن Three.js الأساسي: المشهد، الكاميرات، الرندر، والـ post-processing.
// ============================================================
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
  // عند تغيير حجم الشاشة نحدث كل الكاميرات والـ composer حتى لا تتمدد الصورة أو تتشوه.
  ;[playerCamera, impactCamera, renderCamera].forEach((camera) => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ============================================================
// 3) خرائط البيئة والإضاءة العامة
// البيئة HDR تعطي انعكاسات واقعية للخامات، والإضاءات هنا تشكل المزاج السينمائي العام.
// ============================================================
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

// ============================================================
// 4) الخامات المشتركة وخامات الأرضيات والجدران
// نجهز الخشب، الباركيه، الطوب، وخامة الجدار الخلفي حتى تستخدمها عناصر المشهد المختلفة.
// ============================================================
const woodMap = generateWoodTexture(1024, 256)
woodMap.colorSpace = THREE.SRGBColorSpace
woodMap.wrapS = THREE.RepeatWrapping
woodMap.wrapT = THREE.RepeatWrapping
woodMap.repeat.set(1.15, 8)

const woodNormal = generateNormalMap(512, 512)
woodNormal.wrapS = THREE.RepeatWrapping
woodNormal.wrapT = THREE.RepeatWrapping
woodNormal.repeat.set(1.15, 8)

const textureLoader = new THREE.TextureLoader()
const exrLoader = new EXRLoader()

// إعدادات نهاية المسار مجمعة هنا حتى يكون تعديل الديكور والأبعاد سهلاً بدون البحث داخل الكود.
// أي تغيير في حجم الجدار، فتحة الدبابيس، أو لافتة النيون يبدأ غالباً من هذا الكائن.
const PIN_END_DESIGN = {
  wall: {
    width: 8,
    height: 3.4,
    y: 1.65,
    z: 20.15,
    repeat: new THREE.Vector2(3.2, 1.35),
  },
  pit: {
    width: 1.82,
    depth: 1.76,
    centerZ: 18.08,
    floorY: 0.052,
    frameZ: 18.88,
    frameY: 0.6,
    frameWidth: 2.04,
    frameHeight: 1.08,
    frameThickness: 0.09,
  },
  neon: {
    y: 2.42,
    z: 20.075,
    width: 2.7,
    height: 1.08,
    red: '#ff2d4d',
    cyan: '#22dfff',
  },
}

function setupRepeatedTexture(texture, repeat, colorSpace = THREE.SRGBColorSpace) {
  // دالة مساعدة لتوحيد طريقة تكرار الخامات ومنع تمدد الصورة على المساحات الكبيرة.
  texture.colorSpace = colorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.copy(repeat)
  return texture
}

function loadRepeatedExr(path, repeat, onLoad) {
  // ملفات EXR تحمل roughness/normal للجدار الخلفي؛ نحملها بشكل غير متزامن ونربطها بالخامة عند الجاهزية.
  exrLoader.load(
    path,
    (texture) => {
      onLoad(setupRepeatedTexture(texture, repeat, THREE.NoColorSpace))
    },
    undefined,
    () => {}
  )
}

function createEndWallMaterial() {
  // خامة الجدار الخلفي من مجلد endOfThaBath: لون + roughness + normal لإحساس PBR واقعي.
  const textureRoot = '/texture/end/endOfThaBath.blend/textures/'
  const repeat = PIN_END_DESIGN.wall.repeat
  const colorMap = setupRepeatedTexture(
    textureLoader.load(`${textureRoot}concrete_tile_facade_diff_1k.jpg`),
    repeat
  )

  // خامة PBR للجدار الخلفي: اللون من الصورة، والـ rough/normal من ملفات EXR داخل مجلد endOfThaBath.
  const material = new THREE.MeshStandardMaterial({
    map: colorMap,
    color: 0x6f7680,
    roughness: 0.7,
    metalness: 0.04,
    envMapIntensity: 0.65,
  })

  loadRepeatedExr(`${textureRoot}concrete_tile_facade_rough_1k.exr`, repeat, (texture) => {
    material.roughnessMap = texture
    material.needsUpdate = true
  })
  loadRepeatedExr(`${textureRoot}concrete_tile_facade_nor_gl_1k.exr`, repeat, (texture) => {
    material.normalMap = texture
    material.normalScale.set(0.75, 0.75)
    material.needsUpdate = true
  })

  return material
}

function createSideWallMaterial() {
  // The brick texture lives under public/, so Vite serves it from the same URL path.
  // RepeatWrapping tiles the image instead of stretching one brick image over the full wall.
  const brickMap = textureLoader.load('/texture/red_brick_1k.blend/textures/red_brick_diff_1k.jpg')
  brickMap.colorSpace = THREE.SRGBColorSpace
  brickMap.wrapS = THREE.RepeatWrapping
  brickMap.wrapT = THREE.RepeatWrapping
  brickMap.repeat.set(12, 2)

  // MeshBasicMaterial keeps both side walls visually consistent because it
  // displays the texture without changing brightness based on each wall normal.
  return new THREE.MeshBasicMaterial({
    map: brickMap,
    color: 0xffffff,
  })
}

function createParquetFloorMaterial({ repeat = new THREE.Vector2(3, 10), clearcoat = 0.35 } = {}) {
  // This parquet image is also inside public/, so the browser can load it by URL.
  // نستخدم نفس خامة الباركيه لتغطية الفراغات السوداء والرمادية بخامة أرضية موحدة.
  const floorMap = textureLoader.load('/texture/floor/diagonal_parquet_1k.blend/textures/diagonal_parquet_diff_1k.jpg')
  floorMap.colorSpace = THREE.SRGBColorSpace
  floorMap.wrapS = THREE.RepeatWrapping
  floorMap.wrapT = THREE.RepeatWrapping
  floorMap.repeat.copy(repeat)

  return new THREE.MeshPhysicalMaterial({
    map: floorMap,
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.0,
  })
}

function createSideFloorMaterial() {
  return createParquetFloorMaterial({ repeat: new THREE.Vector2(3, 10), clearcoat: 0.35 })
}

const POSTER_TEXTURES = [
  '/texture/posters/postre1.PNG',
  '/texture/posters/poster2.PNG',
  '/texture/posters/poster3.PNG',
  '/texture/posters/poster4.PNG',
  '/texture/posters/poster5.PNG',
  '/texture/posters/poster6.PNG',
  '/texture/posters/poster7.PNG',
  '/texture/posters/posetr8.PNG',
]

function createPosterMaterial(texturePath) {
  // Posters are flat artwork, so MeshBasicMaterial preserves the image colors.
  const posterMap = textureLoader.load(texturePath)
  posterMap.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    map: posterMap,
    side: THREE.DoubleSide,
  })
}

function addPosterSpotlight(group, { side, z, posterY }) {
  // كل بوستر له مصباح صغير ومخروط ضوء شفاف حتى لا تبدو الصور ملصوقة على الحائط فقط.
  const lightX = side * 3.72
  const targetX = side * 4.02
  const lightY = 2.82
  const lightZ = z - 0.1
  const targetY = posterY + 0.18
  const softLightColor = 0xffead0

  const fixtureMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2933,
    roughness: 0.32,
    metalness: 0.65,
  })
  const glowMaterial = new THREE.MeshBasicMaterial({ color: softLightColor })

  // قاعدة صغيرة على الحائط حتى يبان المصباح مركب فعلياً وليس مجرد ضوء غير مرئي.
  const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.34), fixtureMaterial)
  wallPlate.position.set(side * 4.035, lightY, lightZ)
  wallPlate.rotation.y = side > 0 ? 0 : Math.PI
  group.add(wallPlate)

  // رأس المصباح مرفوع فوق البوستر وموجه باتجاهه، مثل إضاءة المعارض.
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.115, 0.22, 24), fixtureMaterial)
  lampHead.rotation.z = side * Math.PI / 2
  lampHead.position.set(lightX, lightY, lightZ)
  lampHead.castShadow = true
  group.add(lampHead)

  // كرة صغيرة مضيئة عند فوهة المصباح حتى يظهر مصدر الضوء بصرياً.
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), glowMaterial)
  bulb.position.set(side * 3.61, lightY - 0.015, lightZ)
  group.add(bulb)

  // الضوء الحقيقي في Three.js غير مرئي، لذلك نضيف مخروط شفاف خفيف لتمثيل اتجاه الشعاع.
  // الهدف أعلى من مركز البوستر قليلاً حتى لا يغطي المخروط الصورة كلها أو يحرقها.
  const beamDirection = new THREE.Vector3(targetX - lightX, targetY - lightY, z - lightZ).normalize()
  const beamLength = 1.18
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, beamLength, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: softLightColor,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  )
  beam.position
    .set(lightX, lightY, lightZ)
    .addScaledVector(beamDirection, beamLength * 0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDirection)
  group.add(beam)

  // هذا هو الـ SpotLight الحقيقي؛ شدته ولونه أخف حتى يعطي لمعة ناعمة على البوستر.
  const light = new THREE.SpotLight(softLightColor, 1.35, 3.4, 0.34, 0.86, 1.15)
  light.position.set(lightX, lightY, lightZ)
  light.target.position.set(targetX, targetY, z)
  group.add(light, light.target)
}

function createWallPosters() {
  // بوسترات جانبية تضيف تفاصيل صالة حقيقية بدون التأثير على مسار اللعب.
  const group = new THREE.Group()
  group.name = 'WallPosters'

  const posterZPositions = [3.4, 5.4, 8.4, 12.4]
  const posterWidth = 0.92
  const posterHeight = 1.24
  const posterY = 1.58
  const wallInset = 0.055

  ;[
    { side: -1, textures: POSTER_TEXTURES.slice(0, 4), rotationY: Math.PI / 2 },
    { side: 1, textures: POSTER_TEXTURES.slice(4, 8), rotationY: -Math.PI / 2 },
  ].forEach(({ side, textures, rotationY }) => {
    textures.forEach((texturePath, index) => {
      const z = posterZPositions[index]

      // A slightly larger black plane behind each image reads like a thin mounted frame.
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth + 0.08, posterHeight + 0.08),
        new THREE.MeshBasicMaterial({ color: 0x05070d, side: THREE.DoubleSide })
      )
      frame.position.set(side * (4.1 - wallInset), posterY, z)
      frame.rotation.y = rotationY
      group.add(frame)

      // The poster plane is nudged a little farther inward so it never z-fights with the wall/frame.
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(posterWidth, posterHeight), createPosterMaterial(texturePath))
      poster.position.set(side * (4.1 - wallInset * 1.5), posterY, z)
      poster.rotation.y = rotationY
      group.add(poster)

      addPosterSpotlight(group, { side, z, posterY })
    })
  })

  return group
}

function createLaneBoardLines() {
  // خطوط ألواح المسار تعطي قراءة بصرية لاتجاه الخشب وحدود منطقة اللعب.
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
  // ============================================================
  // 5) بناء المسار الرئيسي
  // المسار مقسم إلى خشب لامع، طبقة زيت، منطقة جافة، مزاريب، ومنطقة اقتراب.
  // ============================================================
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
    createParquetFloorMaterial({ repeat: new THREE.Vector2(2.1, 2.4), clearcoat: 0.28 })
  )
  approach.position.set(0, -0.006, -1.35)
  approach.receiveShadow = true
  group.add(approach)

  group.add(createLaneBoardLines())
  return group
}

function createScoreScreens() {
  // شاشات النتائج بقيت معرفة هنا لاستخدامها لاحقاً، لكنها غير مضافة حالياً حتى لا تتداخل مع حائط النيون.
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

function createStrikeNeonTexture({ reflected = false } = {}) {
  // نرسم اللافتة على Canvas حتى نحصل على نيون واضح بدون إضافة ملفات صور جديدة.
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const { red, cyan } = PIN_END_DESIGN.neon

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (reflected) {
    ctx.translate(0, canvas.height)
    ctx.scale(1, -1)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.font = '900 156px Arial, sans-serif'
  ctx.shadowColor = red
  ctx.shadowBlur = 38
  ctx.strokeStyle = red
  ctx.lineWidth = 12
  ctx.strokeText('STRIKE', 512, 142)
  ctx.shadowBlur = 8
  ctx.fillStyle = 'rgba(255, 128, 142, 0.86)'
  ctx.fillText('STRIKE', 512, 142)

  ctx.shadowColor = cyan
  ctx.shadowBlur = 28
  ctx.strokeStyle = cyan
  ctx.fillStyle = 'rgba(78, 232, 255, 0.88)'
  ctx.lineWidth = 10

  // أيقونة بسيطة: كرة بولينغ وثلاث دبابيس تحت كلمة STRIKE مثل لافتات الصالات.
  ctx.beginPath()
  ctx.arc(512, 326, 46, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(498, 310, 5, 0, Math.PI * 2)
  ctx.arc(522, 310, 5, 0, Math.PI * 2)
  ctx.arc(512, 334, 5, 0, Math.PI * 2)
  ctx.fill()

  ;[-86, 0, 86].forEach((offset, index) => {
    ctx.save()
    ctx.translate(512 + offset, 338)
    ctx.rotate((index - 1) * 0.12)
    ctx.beginPath()
    ctx.moveTo(-15, 56)
    ctx.bezierCurveTo(-27, 24, -13, 0, -8, -35)
    ctx.bezierCurveTo(-5, -56, 5, -56, 8, -35)
    ctx.bezierCurveTo(13, 0, 27, 24, 15, 56)
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createStrikeNeonSign() {
  // لافتة النيون فوق الدبابيس: CanvasTexture + emissive + Bloom ليظهر التوهج بدون ملفات صور خارجية.
  const group = new THREE.Group()
  group.name = 'StrikeNeonSign'

  const signMap = createStrikeNeonTexture()
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(PIN_END_DESIGN.neon.width, PIN_END_DESIGN.neon.height),
    new THREE.MeshStandardMaterial({
      map: signMap,
      emissiveMap: signMap,
      emissive: 0xffffff,
      emissiveIntensity: 2.9,
      transparent: true,
      roughness: 0.22,
      metalness: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  )
  sign.position.set(0, PIN_END_DESIGN.neon.y, PIN_END_DESIGN.neon.z)
  // ندير اللافتة لتواجه اللاعب والكاميرا، حتى لا تظهر كلمة STRIKE معكوسة من ظهر الـ Plane.
  sign.rotation.y = Math.PI
  group.add(sign)

  // انعكاس خفيف جداً على المسار يعطي إحساس الأرضية المصقولة بدون تشويش على اللعب.
  const reflectionMap = createStrikeNeonTexture({ reflected: true })
  const reflection = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.82),
    new THREE.MeshBasicMaterial({
      map: reflectionMap,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  )
  reflection.rotation.x = -Math.PI / 2
  reflection.position.set(0, 0.055, 16.05)
  group.add(reflection)

  const redGlow = new THREE.PointLight(0xff2d4d, 1.15, 5.0, 1.9)
  redGlow.position.set(0, PIN_END_DESIGN.neon.y + 0.08, 19.45)
  const cyanGlow = new THREE.PointLight(0x22dfff, 0.75, 4.2, 1.9)
  cyanGlow.position.set(0, PIN_END_DESIGN.neon.y - 0.34, 19.45)
  group.add(redGlow, cyanGlow)

  return group
}

function createPinDeckPit() {
  // فتحة الدبابيس الخلفية: أرضية سوداء وإطار غامق يعطيان عمقاً مثل صالات البولينغ الحقيقية.
  const group = new THREE.Group()
  group.name = 'PinDeckPit'
  const { pit } = PIN_END_DESIGN

  const pitMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x020306,
    roughness: 0.82,
    metalness: 0.08,
    clearcoat: 0.08,
    clearcoatRoughness: 0.65,
    envMapIntensity: 0.22,
  })
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x040507,
    roughness: 0.36,
    metalness: 0.58,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.72,
  })

  // أرضية سوداء منخفضة خلف الدبابيس لتظهر كمنطقة pin deck / pit حقيقية.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(pit.width, 0.045, pit.depth), pitMaterial)
  deck.position.set(0, pit.floorY, pit.centerZ)
  deck.receiveShadow = true
  group.add(deck)

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(pit.width, 0.92, 0.08), pitMaterial)
  backPanel.position.set(0, 0.48, 18.98)
  backPanel.receiveShadow = true
  group.add(backPanel)

  const sideFrameGeometry = new THREE.BoxGeometry(pit.frameThickness, pit.frameHeight, 0.12)
  ;[-1, 1].forEach((side) => {
    const sideFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial)
    sideFrame.position.set(side * pit.frameWidth * 0.5, pit.frameY, pit.frameZ)
    sideFrame.castShadow = true
    sideFrame.receiveShadow = true
    group.add(sideFrame)
  })

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(pit.frameWidth + pit.frameThickness, pit.frameThickness, 0.12),
    frameMaterial
  )
  topFrame.position.set(0, pit.frameY + pit.frameHeight * 0.5, pit.frameZ)
  topFrame.castShadow = true
  group.add(topFrame)

  const bottomFrame = topFrame.clone()
  bottomFrame.position.y = pit.frameY - pit.frameHeight * 0.5
  group.add(bottomFrame)

  const pitFill = new THREE.PointLight(0x16233a, 0.34, 2.4, 2.0)
  pitFill.position.set(0, 0.58, 18.55)
  group.add(pitFill)

  return group
}

function createPinEndLighting() {
  const group = new THREE.Group()
  group.name = 'PinEndLighting'

  // ضوء دافئ موجه للدبابيس حتى تبقى واضحة داخل الفتحة الداكنة.
  const warmImpact = new THREE.SpotLight(0xffd0a0, 1.45, 7.5, 0.42, 0.72, 1.25)
  warmImpact.position.set(0, 2.4, 15.9)
  warmImpact.target.position.set(0, 0.22, 17.45)
  configureShadowLight(warmImpact, 1024)
  group.add(warmImpact, warmImpact.target)

  const backGlow = new THREE.PointLight(0x1ebfff, 0.42, 4.6, 2.05)
  backGlow.position.set(0, 2.05, 19.45)
  group.add(backGlow)

  return group
}

function createCeilingLighting() {
  // إضاءة السقف: شرائط LED ومصابيح دافئة موزعة على طول الصالة.
  const group = new THREE.Group()
  group.name = 'ModernCeilingLighting'

  const ledColor = 0x00dfff
  const warmLightColor = 0xfff2cc
  const ledMaterial = new THREE.MeshStandardMaterial({
    color: ledColor,
    emissive: ledColor,
    emissiveIntensity: 3.1,
    roughness: 0.18,
    metalness: 0.05,
  })
  const ledGlowMaterial = new THREE.MeshBasicMaterial({
    color: ledColor,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  ;[-1, 1].forEach((side) => {
    // خط LED طويل قريب من الحائط الجانبي، موازي للمسار ويمتد تقريباً على كامل طول الصالة.
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 20.6), ledMaterial)
    ledStrip.position.set(side * 3.15, 3.275, 8.5)
    group.add(ledStrip)

    // طبقة شفافة أعرض قليلاً تعطي إحساس توهج ناعم حول خط الـ LED.
    const ledGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 20.6), ledGlowMaterial)
    ledGlow.position.set(side * 3.15, 3.245, 8.5)
    group.add(ledGlow)
  })

  const fixtureMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.28,
    metalness: 0.7,
  })
  const diffuserMaterial = new THREE.MeshStandardMaterial({
    color: warmLightColor,
    emissive: warmLightColor,
    emissiveIntensity: 1.8,
    roughness: 0.22,
    metalness: 0.02,
  })

  const downlightZPositions = [1.3, 4.5, 7.7, 10.9, 14.1, 17.3]
  downlightZPositions.forEach((z) => {
    // جسم صغير داخل السقف حتى يكون مصدر الضوء مرئياً ومنظماً مثل صالات البولينغ الحديثة.
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.055, 32), fixtureMaterial)
    fixture.position.set(0, 3.275, z)
    group.add(fixture)

    const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.018, 32), diffuserMaterial)
    diffuser.position.set(0, 3.24, z)
    group.add(diffuser)

    // SpotLight موجه للأسفل: يعطي إضاءة ناعمة على الأرضية، الكرات، الدبابيس والبوسترات.
    const downLight = new THREE.SpotLight(warmLightColor, 1.45, 5.2, 0.58, 0.74, 1.12)
    downLight.position.set(0, 3.16, z)
    downLight.target.position.set(0, 0.04, z)
    configureShadowLight(downLight, 512)
    group.add(downLight, downLight.target)
  })

  return group
}

const BALL_RACK_COLORS = [
  0x0ea5e9,
  0x7c3aed,
  0xef4444,
  0xf59e0b,
  0x22c55e,
  0xec4899,
  0x2563eb,
  0xffffff,
  0x14b8a6,
]

function createBallReturn({
  name = 'BallReturn',
  x = 1.7,
  z = 1.75,
  scale = 1.05,
  colors = BALL_RACK_COLORS,
} = {}) {
  // حامل الكرات الجانبي عنصر ديكور ثابت، لا يدخل في الفيزياء.
  const group = new THREE.Group()
  group.name = name

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.32, metalness: 0.7 })
  const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.35 })

  const rackLength = 2.75 * scale
  const ballRadius = 0.13 * scale
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.3 * scale, rackLength), coverMaterial)
  base.position.set(x, 0.15 * scale, z)
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  ;[-0.12, 0.12].forEach((xOffset) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, rackLength + 0.18 * scale, 16), railMaterial)
    rail.rotation.x = Math.PI / 2
    rail.position.set(x + xOffset * scale, 0.37 * scale, z)
    rail.castShadow = true
    group.add(rail)
  })

  colors.forEach((color, index) => {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius, 24, 24),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.18,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.4,
      })
    )
    const row = index % 2
    const column = Math.floor(index / 2)
    const columns = Math.ceil(colors.length / 2)
    const usableLength = rackLength - ballRadius * 3
    const zStep = columns > 1 ? usableLength / (columns - 1) : 0
    ball.position.set(
      x + (row === 0 ? -0.095 : 0.095) * scale,
      0.52 * scale,
      z - usableLength / 2 + column * zStep
    )
    ball.castShadow = true
    ball.receiveShadow = true
    group.add(ball)
  })

  return group
}

function createCinematicHall() {
  // ============================================================
  // 6) بناء الصالة الكاملة
  // يجمع الأرضيات، الحوائط، السقف، نهاية المسار، الديكور الجانبي، وحوامل الكرات.
  // ============================================================
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

  const sideFloorMaterial = createSideFloorMaterial()
  ;[-1, 1].forEach((side) => {
    // Side floor panels sit outside the lane/gutter area only; the main bowling lane keeps its own wood material.
    // They are placed a little above the dark base floor to prevent z-fighting flicker.
    const sideFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 18.6), sideFloorMaterial)
    sideFloor.rotation.x = -Math.PI / 2
    sideFloor.position.set(side * 2.45, -0.039, 9.1)
    sideFloor.receiveShadow = true
    group.add(sideFloor)
  })

  ;[-1, 1].forEach((side) => {
    // نكمل الباركيه الجانبي عند نهاية المسار حتى لا يبقى فراغ أسود بجانب منطقة الدبابيس.
    const rearSideFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(3.25, 2.25),
      createParquetFloorMaterial({ repeat: new THREE.Vector2(3, 1.3), clearcoat: 0.35 })
    )
    rearSideFloor.rotation.x = -Math.PI / 2
    rearSideFloor.position.set(side * 2.45, -0.038, 19.45)
    rearSideFloor.receiveShadow = true
    group.add(rearSideFloor)
  })

  // أرضية أمامية من نفس الباركيه تغطي المساحة السوداء حول منطقة الاقتراب أمام المسار.
  const frontFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 3.15),
    createParquetFloorMaterial({ repeat: new THREE.Vector2(5.4, 2.2), clearcoat: 0.32 })
  )
  frontFloor.rotation.x = -Math.PI / 2
  frontFloor.position.set(0, -0.038, -1.55)
  frontFloor.receiveShadow = true
  group.add(frontFloor)

  // الجدار الخلفي يستخدم خامة endOfThaBath ليعطي إحساس صالة بولينغ حديثة بدل لون مسطح.
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(PIN_END_DESIGN.wall.width, PIN_END_DESIGN.wall.height, 0.12),
    createEndWallMaterial()
  )
  backWall.position.set(0, PIN_END_DESIGN.wall.y, PIN_END_DESIGN.wall.z)
  backWall.receiveShadow = true
  group.add(backWall)

  const sideWallMaterial = createSideWallMaterial()
  ;[-4.1, 4.1].forEach((x) => {
    // Both long side walls use the same tiled brick material so the texture covers the full hall length.
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 24), sideWallMaterial)
    wall.position.set(x, 1.55, 8)
    wall.receiveShadow = true
    group.add(wall)
  })

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(8.3, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.62, metalness: 0.18 })
  )
  ceiling.position.set(0, 3.35, 8)
  group.add(ceiling)

  group.add(createCeilingLighting())

  group.add(createPinDeckPit())
  group.add(createStrikeNeonSign())
  group.add(createPinEndLighting())
  group.add(createWallPosters())
  group.add(createBallReturn({
    name: 'LeftBallRack',
    x: -1.10,
    z: 1.65,
  }))
  group.add(createBallReturn({
    name: 'RightBallRack',
    x: 1.10,
    z: 1.65,
  }))
  return group
}

const hallGroup = createCinematicHall()
scene.add(hallGroup)

// ============================================================
// 7) إضافة عناصر المسار للمشهد
// بعد بناء الصالة نضيف المسار وخط نهاية الزيت كعناصر مستقلة ليسهل التحكم بها.
// ============================================================
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
  // نستخدم traverse حتى نطبق الظلال على كل Mesh داخل نماذج GLTF المركبة.
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
  // توحيد ارتفاع النموذج المستورد حتى لا تختلف أحجام النماذج حسب ملف GLTF الأصلي.
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetHeight / Math.max(size.y, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
  object.position.y -= scaledBox.min.y - center.y
}

function normalizeModelToFootprint(object, targetWidth) {
  // الأثاث يحتاج قياساً حسب مساحة الأرض لا حسب الارتفاع، لذلك نطبعه على عرض محدد.
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetWidth / Math.max(size.x, size.z, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
  object.position.y -= scaledBox.min.y - center.y
}

function prepareStaticModelTemplate(object, targetWidth) {
  // Static furniture is decorative only: it casts/receives shadows but never enters physics.
  normalizeModelToFootprint(object, targetWidth)
  setObjectShadows(object)
  return object
}

function normalizeBallModel(object, targetDiameter) {
  // الكرة المستوردة تضبط حسب القطر الفيزيائي حتى يطابق شكلها حسابات التصادم.
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetDiameter / Math.max(size.x, size.y, size.z, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
}

function enhanceBallMaterial(object) {
  // نستبدل خامات الكرة المستوردة بخامة لامعة موحدة حتى تظهر بانعكاسات واضحة.
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
  // كرة احتياطية تظهر مباشرة إذا تأخر تحميل نموذج GLTF أو فشل.
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
  // دبوس احتياطي بسيط يستخدم قبل تحميل نموذج الدبوس الحقيقي.
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

// ============================================================
// 8) تحميل النماذج ثلاثية الأبعاد
// نبدأ بعناصر fallback ثم نستبدلها بنماذج GLTF عند اكتمال التحميل.
// ============================================================
const ballMesh = new THREE.Group()
ballMesh.name = 'PhysicsSyncedBall'
const ballVisualRoot = new THREE.Group()
ballVisualRoot.name = 'BallVisualRoot'
ballVisualRoot.add(createFallbackBall())
ballMesh.add(ballVisualRoot)
scene.add(ballMesh)

function loadBallModel() {
  // تحميل نموذج الكرة الحقيقي واستبدال fallback بدون تغيير كائن الفيزياء المرتبط به.
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
  // تحميل نموذج دبوس واحد ثم نسخه على كل الدبابيس حتى نقلل تكلفة التحميل.
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

function addFurnitureClone(group, template, { x, z, rotationY }) {
  const wrapper = new THREE.Group()
  wrapper.position.set(x, 0, z)
  wrapper.rotation.y = rotationY
  wrapper.add(template.clone(true))
  group.add(wrapper)
}

function populateSeatingArea(group, sofaTemplate, tableTemplate) {
  const seatZPositions = [3.1, 6.4, 9.7, 13.0]
  const sofaX = 3.12
  const tableX = 2.25

  seatZPositions.forEach((z) => {
    ;[
      { side: -1, rotationY: Math.PI / 2 },
      { side: 1, rotationY: -Math.PI / 2 },
    ].forEach(({ side, rotationY }) => {
      // Keep the seating outside the gutters, with tables between the sofas and the lane.
      addFurnitureClone(group, sofaTemplate, { x: side * sofaX, z, rotationY })
      addFurnitureClone(group, tableTemplate, { x: side * tableX, z, rotationY })
    })
  })
}

function createSeatingArea() {
  // منطقة الجلوس ديكور ثابت: الأرائك والطاولات تحمل مرة واحدة ثم تنسخ على الجانبين.
  const group = new THREE.Group()
  group.name = 'SeatingArea'

  let sofaTemplate = null
  let tableTemplate = null

  function buildWhenReady() {
    if (!sofaTemplate || !tableTemplate) return

    // Each GLTF is loaded once, then cloned for every repeated seating bay.
    populateSeatingArea(group, sofaTemplate, tableTemplate)
  }

  gltfLoader.load(
    '/Models/sofa/sofa_02_1k.gltf/sofa_02_1k.gltf',
    (gltf) => {
      sofaTemplate = prepareStaticModelTemplate(gltf.scene, 1.65)
      buildWhenReady()
    },
    undefined,
    () => {}
  )

  gltfLoader.load(
    '/Models/table/ClassicConsole_01_1k.gltf/ClassicConsole_01_1k.gltf',
    (gltf) => {
      tableTemplate = prepareStaticModelTemplate(gltf.scene, 0.95)
      buildWhenReady()
    },
    undefined,
    () => {}
  )

  return group
}

loadBallModel()

const seatingArea = createSeatingArea()
scene.add(seatingArea)

const pinMeshes = Array.from({ length: 10 }, () => {
  const group = createFallbackPin()
  scene.add(group)
  return group
})
loadPinModel(pinMeshes)

// ============================================================
// 9) الفيزياء وحالة الجولة
// هنا نربط الكرة والدبابيس ومدير التصادم، ونحفظ عدادات الجولة وملخصها.
// ============================================================
const ballPhysics = new BallPhysics(BALL_MASS, BALL_RADIUS, BALL_START_POS)
const pinPhysics = new PinPhysics()
// CollisionManager links ball physics with pin physics; rendering only reads the resulting state.
const collisionManager = new CollisionManager(ballPhysics, pinPhysics)

// نظام صوت بسيط: صوت الكرة يشتغل كحلقة أثناء التدحرج، وصوت الدبابيس يعمل مرة عند السقوط.
const rollingBallSound = new Audio(SOUND_PATHS.rollingBall)
rollingBallSound.preload = 'auto'
rollingBallSound.loop = true
rollingBallSound.volume = 0

const pinFallSounds = Array.from({ length: 4 }, () => {
  const sound = new Audio(SOUND_PATHS.pinFall)
  sound.preload = 'auto'
  sound.volume = 0.8
  return sound
})

let lastTime = performance.now()
let isRunning = false
let activeFrameCount = 0
let settleFrameCount = 0
let summaryFallbackFrameCount = 0
let summaryShown = false
let previousPinStates = null
let currentOilPattern = 'Medium'
let knockedPinsTracker = new Array(10).fill(false)
let lastPinFallSoundTime = 0

function playSound(sound) {
  // المتصفح قد يمنع الصوت قبل أول تفاعل من المستخدم؛ لذلك نتجاهل الخطأ بدل إيقاف اللعبة.
  sound.play().catch(() => {})
}

function stopRollingBallSound() {
  // عند توقف الرمية نوقف صوت التدحرج ونرجعه للبداية حتى يبدأ نظيفًا في الرمية التالية.
  rollingBallSound.pause()
  rollingBallSound.currentTime = 0
  rollingBallSound.volume = 0
}

function updateRollingBallSound(ballState) {
  // كلما زادت سرعة الكرة نرفع صوت التدحرج قليلًا، وعند التوقف نوقف الحلقة الصوتية.
  if (!isRunning || ballState.phase === 'idle' || ballState.phase === 'stopped' || ballState.speed <= 0.04) {
    stopRollingBallSound()
    return
  }

  rollingBallSound.volume = THREE.MathUtils.clamp(ballState.speed / 9, 0.14, 0.55)
  rollingBallSound.playbackRate = THREE.MathUtils.clamp(0.75 + ballState.speed / 14, 0.75, 1.25)

  if (rollingBallSound.paused) {
    playSound(rollingBallSound)
  }
}

function playPinFallSound() {
  const now = performance.now()
  if (now - lastPinFallSoundTime < PIN_FALL_SOUND_COOLDOWN_MS) return
  lastPinFallSoundTime = now

  // نستخدم عدة نسخ من نفس الصوت حتى لا يقطع سقوط دبوس جديد صوت السقوط السابق.
  const sound = pinFallSounds.find((item) => item.paused || item.ended) ?? pinFallSounds[0]
  sound.pause()
  sound.currentTime = 0
  sound.volume = 0.82
  playSound(sound)
}

function getOilPatternEnd() {
  // نمط الزيت يحدد أين ينتهي الاحتكاك المنخفض ويبدأ الجزء الجاف من المسار.
  if (currentOilPattern === 'Short') return 9
  if (currentOilPattern === 'Long') return 15
  return 12
}

function getCurrentFriction(z) {
  // main only chooses the oil-zone friction value; the ball class still owns motion physics.
  return z <= getOilPatternEnd() ? 0.05 : 0.20
}

function initScenePositions() {
  // مزامنة أولية بين الفيزياء والمشهد المرئي عند التحميل أو بدء إطار جديد.
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
    // Fallen pins rotate around the model pivot near their base, so PinPhysics
    // provides a small lift to keep the tilted body visually on top of the lane.
    // نرفع الدبابيس قليلاً بصرياً حتى لا تبدو مخترقة أرضية الـ pin deck عند الوقوف أو السقوط.
    const visualY = Math.max(0, state.position.y - 0.19 + (state.visualLift ?? 0) + PIN_VISUAL_FLOOR_OFFSET)
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

function isTypingInControl(target) {
  // إذا كان المستخدم يكتب داخل خانة أو يتحكم بلوحة الإعدادات، لا نعتبر المسافة أمر إطلاق.
  const tagName = target?.tagName?.toLowerCase()
  return target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button'
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  // 1/3 switch camera modes while the simulation is running.
  if (event.key === '1') setCameraMode(CAMERA_MODES.PLAYER)
  if (event.key === '3') setCameraMode(CAMERA_MODES.IMPACT)

  if (event.code === 'Space' && !isTypingInControl(event.target)) {
    // زر المسافة يطلق الكرة بنفس القيم الحالية الموجودة في لوحة Launch.
    event.preventDefault()
    const { v0, angle, revRate, oilPattern } = ui.getInputs()
    launchBall(v0, angle, revRate, oilPattern)
  }
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
  // ============================================================
  // 10) نظام الكاميرات
  // كاميرا اللاعب تتبع الكرة، وكاميرا الاصطدام تركز على منطقة الدبابيس.
  // ============================================================
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
      // هنا نربط صوت سقوط الدبابيس بلحظة تغير حالة الدبوس من واقف إلى ساقط.
      playPinFallSound()
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
  // نقارن حالة الدبابيس بين الإطارات لنعرف متى توقفت الحركة فعلياً.
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
  // تنتهي الجولة عندما تتوقف الكرة والدبابيس، أو عندما نصل لنهاية المسار وننتظر عدة إطارات.
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
  // إظهار ملخص النتيجة مرة واحدة فقط بعد استقرار الرمية.
  if (summaryShown) return

  summaryShown = true
  isRunning = false
  stopRollingBallSound()

  ui.showSummary({
    pinsKnockedDown: pinPhysics.getStates().filter((state) => !state.isStanding).length,
    finalBallVelocity: ballPhysics.getState().speed,
    oilPatternName: currentOilPattern,
  })
}

function resetFrameState() {
  // إعادة كل حالة الجولة: الفيزياء، العدادات، الكاميرا، ومؤشرات الملخص.
  isRunning = false
  stopRollingBallSound()
  knockedPinsTracker = new Array(10).fill(false)
  lastPinFallSoundTime = 0
  // Reset physics first, then sync visuals to the same state.
  ballPhysics.reset()
  pinPhysics.reset()
  activeFrameCount = 0
  settleFrameCount = 0
  summaryFallbackFrameCount = 0
  summaryShown = false
  previousPinStates = null

  initScenePositions()
  setCameraMode(CAMERA_MODES.PLAYER)
  renderCamera.position.set(0, 1.8, -2.8)
  renderCamera.lookAt(0, 0.18, 9)
}

function applyRenderSettings(settings = renderSettings) {
  // ربط إعدادات واجهة المستخدم بجودة الرندر: Bloom، exposure، والظلال.
  Object.assign(renderSettings, settings)
  renderer.toneMappingExposure = renderSettings.exposure
  renderer.shadowMap.enabled = renderSettings.shadows
  bloomPass.enabled = renderSettings.bloom
  bloomPass.strength = renderSettings.bloomStrength
  bloomPass.radius = renderSettings.bloomRadius
  bloomPass.threshold = renderSettings.bloomThreshold
}

function gameLoop(currentTime) {
  // ============================================================
  // 11) الحلقة الرئيسية
  // كل frame: تحديث فيزياء، تصادمات، مزامنة Meshes، تحديث كاميرا، ثم Render.
  // ============================================================
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
    updateRollingBallSound(ballPhysics.getState())

    if (isSimulationSettled()) {
      showSimulationSummary()
    }
  }

  updateSimulationHUD()

  const ballState = ballPhysics.getState()
  updateCameraSystem(dt, ballState)
  // تم إلغاء أثر الكرة والجسيمات البصرية حتى يبقى المشهد نظيفاً أثناء الرمية والاصطدام.

  if (renderSettings.bloom) {
    composer.render()
  } else {
    renderer.render(scene, renderCamera)
  }
}

export function launchBall(v0, angle, revRate, oilPattern = 'Medium') {
  // نقطة تشغيل الرمية من الواجهة: نعيد ضبط الإطار ثم نطلق الكرة بالقيم المدخلة.
  resetFrameState()
  currentOilPattern = oilPattern
  ballPhysics.launch(v0, angle, revRate)
  isRunning = true
  updateRollingBallSound(ballPhysics.getState())
}

export function stopSimulation() {
  isRunning = false
  stopRollingBallSound()
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

// ============================================================
// 12) ربط واجهة التحكم بالمحاكاة
// DOMInterface لا يعرف تفاصيل الفيزياء؛ فقط يرسل أوامر launch/reset/settings إلى main.
// ============================================================
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
