import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { PIN_END_DESIGN } from '/src/config/simulationConfig.js'
import { generateWoodTexture, generateNormalMap } from '/src/textureGenerator.js'

// ============================================================
// مسؤولية العضو 4: الخامات والTextures
// ركز هنا عند تعديل خشب المسار، جدران الطوب، الباركيه، بوسترات الجدران، أو خامة الجدار الخلفي.
// ============================================================

export const POSTER_TEXTURES = [
  '/texture/posters/postre1.PNG',
  '/texture/posters/poster2.PNG',
  '/texture/posters/poster3.PNG',
  '/texture/posters/poster4.PNG',
  '/texture/posters/poster5.PNG',
  '/texture/posters/poster6.PNG',
  '/texture/posters/poster7.PNG',
  '/texture/posters/posetr8.PNG',
]

export function createSceneMaterials() {
  // هذا الملف يجمع تحميل الخامات حتى لا تنتشر مسارات الصور داخل ملفات البناء الأخرى.
  const textureLoader = new THREE.TextureLoader()
  const exrLoader = new EXRLoader()

  // خامة الخشب مولدة بـCanvas حتى لا نحتاج ملف صورة خارجي للمسار الرئيسي.
  const woodMap = generateWoodTexture(1024, 256)
  woodMap.colorSpace = THREE.SRGBColorSpace
  woodMap.wrapS = THREE.RepeatWrapping
  woodMap.wrapT = THREE.RepeatWrapping
  woodMap.repeat.set(1.15, 8)

  const woodNormal = generateNormalMap(512, 512)
  woodNormal.wrapS = THREE.RepeatWrapping
  woodNormal.wrapT = THREE.RepeatWrapping
  woodNormal.repeat.set(1.15, 8)

  function setupRepeatedTexture(texture, repeat, colorSpace = THREE.SRGBColorSpace) {
    // يكرر الخامة على السطح بدل تمديد صورة واحدة على مساحة كبيرة.
    texture.colorSpace = colorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.copy(repeat)
    return texture
  }

  function loadRepeatedExr(path, repeat, onLoad) {
    // ملفات EXR تحمل roughness/normal وتربط بالخامة بعد اكتمال التحميل.
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
    // يبني خامة الجدار الخلفي من color map وخرائط roughness/normal.
    const textureRoot = '/texture/end/endOfThaBath.blend/textures/'
    const repeat = PIN_END_DESIGN.wall.repeat
    const colorMap = setupRepeatedTexture(
      textureLoader.load(`${textureRoot}concrete_tile_facade_diff_1k.jpg`),
      repeat
    )

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
    // الجدران الجانبية تستخدم brick texture مكررة على طول الصالة.
    const brickMap = textureLoader.load('/texture/red_brick_1k.blend/textures/red_brick_diff_1k.jpg')
    brickMap.colorSpace = THREE.SRGBColorSpace
    brickMap.wrapS = THREE.RepeatWrapping
    brickMap.wrapT = THREE.RepeatWrapping
    brickMap.repeat.set(12, 2)

    return new THREE.MeshBasicMaterial({
      map: brickMap,
      color: 0xffffff,
    })
  }

  function createParquetFloorMaterial({ repeat = new THREE.Vector2(3, 10), clearcoat = 0.35 } = {}) {
    // خامة الباركيه تستخدم للأرضيات الجانبية والأمامية خارج المسار.
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
    // نسخة جاهزة للأرضيات الجانبية بتكرار مناسب لطول الصالة.
    return createParquetFloorMaterial({ repeat: new THREE.Vector2(3, 10), clearcoat: 0.35 })
  }

  function createPosterMaterial(texturePath) {
    // البوسترات MeshBasicMaterial حتى تظهر ألوان الصورة كما هي بدون تأثر قوي بالإضاءة.
    const posterMap = textureLoader.load(texturePath)
    posterMap.colorSpace = THREE.SRGBColorSpace

    return new THREE.MeshBasicMaterial({
      map: posterMap,
      side: THREE.DoubleSide,
    })
  }

  return {
    woodMap,
    woodNormal,
    createEndWallMaterial,
    createSideWallMaterial,
    createParquetFloorMaterial,
    createSideFloorMaterial,
    createPosterMaterial,
  }
}
