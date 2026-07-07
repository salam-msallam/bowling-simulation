import * as THREE from 'three'
import { PIN_END_DESIGN } from '/src/config/simulationConfig.js'
import { POSTER_TEXTURES } from '/src/scene/createMaterials.js'

// ============================================================
// مسؤولية العضو 4: بناء الصالة والديكور
// ركز هنا عند تعديل الجدران، الأرضيات، السقف، النيون، البوسترات، رفوف الكرات، ومنطقة نهاية الدبابيس.
// ============================================================

function addPosterSpotlight(group, { side, z, posterY }) {
  // لكل بوستر مصباح صغير ومخروط ضوء شفاف حتى لا تبدو الصور ملصقة فقط على الحائط.
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

  const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.34), fixtureMaterial)
  // قاعدة صغيرة على الحائط تجعل مصدر الضوء مفهوماً بصرياً.
  wallPlate.position.set(side * 4.035, lightY, lightZ)
  wallPlate.rotation.y = side > 0 ? 0 : Math.PI
  group.add(wallPlate)

  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.115, 0.22, 24), fixtureMaterial)
  // رأس المصباح موجه نحو البوستر.
  lampHead.rotation.z = side * Math.PI / 2
  lampHead.position.set(lightX, lightY, lightZ)
  lampHead.castShadow = true
  group.add(lampHead)

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), glowMaterial)
  bulb.position.set(side * 3.61, lightY - 0.015, lightZ)
  group.add(bulb)

  const beamDirection = new THREE.Vector3(targetX - lightX, targetY - lightY, z - lightZ).normalize()
  // مخروط شفاف يرسم اتجاه الضوء فقط، وليس له تأثير فيزيائي.
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
  beam.position.set(lightX, lightY, lightZ).addScaledVector(beamDirection, beamLength * 0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDirection)
  group.add(beam)

  const light = new THREE.SpotLight(softLightColor, 1.35, 3.4, 0.34, 0.86, 1.15)
  light.position.set(lightX, lightY, lightZ)
  light.target.position.set(targetX, targetY, z)
  group.add(light, light.target)
}

function createWallPosters(materials) {
  // يضيف أربع بوسترات لكل جدار جانبي مع إطار وإضاءة صغيرة.
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

      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth + 0.08, posterHeight + 0.08),
        new THREE.MeshBasicMaterial({ color: 0x05070d, side: THREE.DoubleSide })
      )
      frame.position.set(side * (4.1 - wallInset), posterY, z)
      frame.rotation.y = rotationY
      group.add(frame)

      const poster = new THREE.Mesh(new THREE.PlaneGeometry(posterWidth, posterHeight), materials.createPosterMaterial(texturePath))
      poster.position.set(side * (4.1 - wallInset * 1.5), posterY, z)
      poster.rotation.y = rotationY
      group.add(poster)

      addPosterSpotlight(group, { side, z, posterY })
    })
  })

  return group
}

function createStrikeNeonTexture({ reflected = false } = {}) {
  // نرسم اللافتة على Canvas حتى نحصل على نيون واضح بدون ملفات صور إضافية.
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const { red, cyan } = PIN_END_DESIGN.neon

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (reflected) {
    // نسخة مقلوبة تستخدم كانعكاس خفيف على أرضية المسار.
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
  // ينشئ لافتة STRIKE فوق منطقة الدبابيس مع انعكاس وإضاءات ملونة.
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
  sign.rotation.y = Math.PI
  group.add(sign)

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
  // يبني فتحة سوداء خلف الدبابيس لتبدو مثل منطقة pit في صالات البولينغ.
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

function createPinEndLighting(configureShadowLight) {
  // إضاءة موجهة خاصة بمنطقة الاصطدام حتى تبقى الدبابيس واضحة داخل الفتحة.
  const group = new THREE.Group()
  group.name = 'PinEndLighting'

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

function createCeilingLighting(configureShadowLight) {
  // يبني شرائط LED ومصابيح سقف موزعة على طول الصالة.
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
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 20.6), ledMaterial)
    ledStrip.position.set(side * 3.15, 3.275, 8.5)
    group.add(ledStrip)

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
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.055, 32), fixtureMaterial)
    fixture.position.set(0, 3.275, z)
    group.add(fixture)

    const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.018, 32), diffuserMaterial)
    diffuser.position.set(0, 3.24, z)
    group.add(diffuser)

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

function createBallReturn({ name = 'BallReturn', x = 1.7, z = 1.75, scale = 1.05, colors = BALL_RACK_COLORS } = {}) {
  // رف كرات جانبي للديكور فقط؛ لا يدخل في الفيزياء أو التصادمات.
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
    ball.position.set(x + (row === 0 ? -0.095 : 0.095) * scale, 0.52 * scale, z - usableLength / 2 + column * zStep)
    ball.castShadow = true
    ball.receiveShadow = true
    group.add(ball)
  })

  return group
}

export function createCinematicHall({ materials, configureShadowLight }) {
  // بناء الصالة الكاملة: الأرضيات، الجدران، السقف، نهاية المسار، والديكور الجانبي.
  const group = new THREE.Group()
  group.name = 'CinematicBowlingHall'

  const floor = new THREE.Mesh(
    // أرضية داكنة أساسية تحت كامل الصالة.
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

  const sideFloorMaterial = materials.createSideFloorMaterial()
  ;[-1, 1].forEach((side) => {
    // أرضيات باركيه جانبية خارج المزاريب.
    const sideFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 18.6), sideFloorMaterial)
    sideFloor.rotation.x = -Math.PI / 2
    sideFloor.position.set(side * 2.45, -0.039, 9.1)
    sideFloor.receiveShadow = true
    group.add(sideFloor)
  })

  ;[-1, 1].forEach((side) => {
    // نكمل الباركيه عند نهاية المسار حتى لا تظهر فراغات سوداء بجانب الدبابيس.
    const rearSideFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(3.25, 2.25),
      materials.createParquetFloorMaterial({ repeat: new THREE.Vector2(3, 1.3), clearcoat: 0.35 })
    )
    rearSideFloor.rotation.x = -Math.PI / 2
    rearSideFloor.position.set(side * 2.45, -0.038, 19.45)
    rearSideFloor.receiveShadow = true
    group.add(rearSideFloor)
  })

  const frontFloor = new THREE.Mesh(
    // أرضية أمامية لمنطقة وقوف اللاعب قبل بداية المسار.
    new THREE.PlaneGeometry(9, 3.15),
    materials.createParquetFloorMaterial({ repeat: new THREE.Vector2(5.4, 2.2), clearcoat: 0.32 })
  )
  frontFloor.rotation.x = -Math.PI / 2
  frontFloor.position.set(0, -0.038, -1.55)
  frontFloor.receiveShadow = true
  group.add(frontFloor)

  const backWall = new THREE.Mesh(
    // الجدار الخلفي خلف الدبابيس يستخدم خامة concrete tile.
    new THREE.BoxGeometry(PIN_END_DESIGN.wall.width, PIN_END_DESIGN.wall.height, 0.12),
    materials.createEndWallMaterial()
  )
  backWall.position.set(0, PIN_END_DESIGN.wall.y, PIN_END_DESIGN.wall.z)
  backWall.receiveShadow = true
  group.add(backWall)

  const sideWallMaterial = materials.createSideWallMaterial()
  ;[-4.1, 4.1].forEach((x) => {
    // الجدران الطويلة على جانبي الصالة.
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 24), sideWallMaterial)
    wall.position.set(x, 1.55, 8)
    wall.receiveShadow = true
    group.add(wall)
  })

  const ceiling = new THREE.Mesh(
    // سقف بسيط يحمل الإضاءة العلوية.
    new THREE.BoxGeometry(8.3, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.62, metalness: 0.18 })
  )
  ceiling.position.set(0, 3.35, 8)
  group.add(ceiling)

  group.add(createCeilingLighting(configureShadowLight))
  group.add(createPinDeckPit())
  group.add(createStrikeNeonSign())
  group.add(createPinEndLighting(configureShadowLight))
  group.add(createWallPosters(materials))
  group.add(createBallReturn({ name: 'LeftBallRack', x: -1.10, z: 1.65 }))
  group.add(createBallReturn({ name: 'RightBallRack', x: 1.10, z: 1.65 }))

  return group
}
