import * as THREE from 'three'

// ============================================================
// مسؤولية العضو 4: بناء المسار
// ركز هنا عند تعديل أرضية اللعب، طبقة الزيت البصرية، المنطقة الجافة، المزاريب، وخط نهاية الزيت.
// ============================================================

function createLaneBoardLines() {
  // خطوط الألواح تساعد على قراءة اتجاه الخشب وحدود منطقة اللعب.
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

export function createCinematicLane(materials) {
  // بناء المسار الرئيسي: الخشب اللامع، طبقة الزيت، المنطقة الجافة، المزاريب، ومنطقة الاقتراب.
  const group = new THREE.Group()
  group.name = 'CinematicLane'

  const lane = new THREE.Mesh(
    // جسم المسار نفسه صندوق رفيع فوق أرضية الصالة.
    new THREE.BoxGeometry(1.05, 0.06, 18),
    new THREE.MeshPhysicalMaterial({
      map: materials.woodMap,
      normalMap: materials.woodNormal,
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
    // طبقة شفافة فوق أول 12 متر لتمثيل الزيت بصرياً فقط؛ الفيزياء تأتي من OilZone.
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
    // طبقة شفافة أخف عند نهاية المسار لتوضيح المنطقة الجافة بصرياً.
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
    materials.createParquetFloorMaterial({ repeat: new THREE.Vector2(2.1, 2.4), clearcoat: 0.28 })
  )
  approach.position.set(0, -0.006, -1.35)
  approach.receiveShadow = true
  group.add(approach)

  group.add(createLaneBoardLines())
  return group
}

export function createOilEndLine() {
  // خط بصري عند نهاية الزيت ليسهل فهم مكان تغير الاحتكاك.
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
  return oilEndLineMesh
}

export function addLaneToScene(scene, materials) {
  // يضيف المسار وخط نهاية الزيت للمشهد ويرجع المراجع لمن يحتاجها لاحقاً.
  const laneGroup = createCinematicLane(materials)
  const oilEndLine = createOilEndLine()
  scene.add(laneGroup, oilEndLine)
  return { laneGroup, oilEndLine }
}
