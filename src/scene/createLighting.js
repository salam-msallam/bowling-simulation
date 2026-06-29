import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// ============================================================
// مسؤولية العضو 4: الإضاءة والبيئة
// ركز هنا عند تعديل HDR، الظلال، إضاءة الدبابيس، أو المزاج العام للصالة.
// ============================================================

export function configureShadowLight(light, size = 1024) {
  // يضبط إعدادات الظلال المشتركة لأي SpotLight يحتاج ظلالاً ناعمة.
  light.castShadow = true
  light.shadow.mapSize.set(size, size)
  light.shadow.camera.near = 0.5
  light.shadow.camera.far = 40
  light.shadow.bias = -0.00008
}

export function createLighting({ scene, renderer }) {
  // الإضاءة العامة وخرائط HDR توضع هنا حتى يبقى بناء المجسمات منفصلاً عن إعداد الضوء.
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()

  function applyEnvironment(texture) {
    // نحول HDR إلى environment map مناسب لانعكاسات خامات PBR.
    const envMap = pmremGenerator.fromEquirectangular(texture).texture
    scene.environment = envMap
    texture.dispose()
  }

  function applyFallbackEnvironment() {
    // fallback داخلي إذا فشل تحميل HDR الخارجي حتى لا يبقى المشهد بلا انعكاسات.
    const roomEnvironment = new RoomEnvironment()
    const envMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture
    scene.environment = envMap
    roomEnvironment.dispose()
  }

  const loader = new RGBELoader()
  // نحاول تحميل HDR الصالة أولاً، ثم HDR بديل، ثم RoomEnvironment.
  loader.load(
    '/hdr/bowling_hall_1k.hdr',
    applyEnvironment,
    undefined,
    () => {
      loader.load('/hdr/colorful_studio_2k.hdr', applyEnvironment, undefined, applyFallbackEnvironment)
    }
  )

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
}
