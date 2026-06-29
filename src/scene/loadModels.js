import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BALL_RADIUS, PIN_VISUAL_HEIGHT } from '/src/config/simulationConfig.js'

// ============================================================
// مسؤولية العضو 4: تحميل النماذج ثلاثية الأبعاد
// ركز هنا عند تعديل نموذج الكرة، نموذج الدبابيس، الأثاث، أو عناصر fallback التي تظهر قبل اكتمال التحميل.
// ============================================================

function setObjectShadows(object, cast = true, receive = true) {
  // نستخدم traverse لتطبيق الظلال على كل Mesh داخل نماذج GLTF المركبة.
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
  // يضبط ارتفاع نموذج GLTF إلى ارتفاع محدد، ثم يعيد تمركزه حول قاعدته.
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
  // يستخدم للأثاث لأن العرض/المساحة أهم من الارتفاع في تنسيقه داخل الصالة.
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
  // الأثاث ديكور ثابت فقط: يأخذ ظلالاً ولا يدخل في الفيزياء.
  normalizeModelToFootprint(object, targetWidth)
  setObjectShadows(object)
  return object
}

function normalizeBallModel(object, targetDiameter) {
  // يضبط حجم نموذج الكرة ليطابق نصف قطر الفيزياء المستخدم في التصادمات.
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetDiameter / Math.max(size.x, size.y, size.z, 0.0001)
  object.scale.multiplyScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(object)
  const center = scaledBox.getCenter(new THREE.Vector3())
  object.position.sub(center)
}

function enhanceBallMaterial(object) {
  // يستبدل خامة الكرة المستوردة بخامة موحدة لامعة حتى تبدو واضحة تحت الإضاءة.
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
  // كرة احتياطية تظهر فوراً قبل تحميل نموذج GLB أو إذا فشل التحميل.
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
  // دبوس احتياطي هندسي بسيط يظهر قبل تحميل نموذج الدبوس الحقيقي.
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

function addFurnitureClone(group, template, { x, z, rotationY }) {
  // يغلف نسخة الأثاث داخل Group مستقل ليسهل وضعها وتدويرها.
  const wrapper = new THREE.Group()
  wrapper.position.set(x, 0, z)
  wrapper.rotation.y = rotationY
  wrapper.add(template.clone(true))
  group.add(wrapper)
}

function populateSeatingArea(group, sofaTemplate, tableTemplate) {
  // يكرر الأرائك والطاولات على الجانبين بشكل متناظر خارج منطقة اللعب.
  const seatZPositions = [3.1, 6.4, 9.7, 13.0]
  const sofaX = 3.12
  const tableX = 2.25

  seatZPositions.forEach((z) => {
    ;[
      { side: -1, rotationY: Math.PI / 2 },
      { side: 1, rotationY: -Math.PI / 2 },
    ].forEach(({ side, rotationY }) => {
      addFurnitureClone(group, sofaTemplate, { x: side * sofaX, z, rotationY })
      addFurnitureClone(group, tableTemplate, { x: side * tableX, z, rotationY })
    })
  })
}

export function createModelManager(scene) {
  // يبدأ العرض بعناصر fallback ثم يستبدلها بنماذج GLTF عند اكتمال التحميل.
  const gltfLoader = new GLTFLoader()

  const ballMesh = new THREE.Group()
  ballMesh.name = 'PhysicsSyncedBall'
  const ballVisualRoot = new THREE.Group()
  ballVisualRoot.name = 'BallVisualRoot'
  ballVisualRoot.add(createFallbackBall())
  ballMesh.add(ballVisualRoot)
  scene.add(ballMesh)

  function loadBallModel() {
    // يحمل نموذج الكرة الحقيقي ويستبدل fallback مع الحفاظ على نفس ballVisualRoot.
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
    // يحمل نموذج دبوس واحد ثم ينسخه على المجموعات العشر لتقليل تكلفة التحميل.
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

  function createSeatingArea() {
    // يحمل نموذج الأريكة والطاولة مرة واحدة، ثم يبني منطقة الجلوس عندما يصبحان جاهزين.
    const group = new THREE.Group()
    group.name = 'SeatingArea'

    let sofaTemplate = null
    let tableTemplate = null

    function buildWhenReady() {
      // لا نبني منطقة الجلوس إلا بعد تحميل النموذجين.
      if (!sofaTemplate || !tableTemplate) return
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

  return {
    ballMesh,
    ballVisualRoot,
    pinMeshes,
    seatingArea,
  }
}
