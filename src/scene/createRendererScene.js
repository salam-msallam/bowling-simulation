import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

function createSceneCamera(fov) {
  return new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 100)
}

export function createRendererScene(renderSettings) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070d)
  scene.fog = new THREE.FogExp2(0x05070d, 0.028)

  const playerCamera = createSceneCamera(55)
  const impactCamera = createSceneCamera(58)

  const renderCamera = createSceneCamera(55)
  renderCamera.position.set(0, 1.8, -2.8)
  renderCamera.lookAt(0, 0.18, 9)

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

  return {
    scene,
    renderer,
    composer,
    bloomPass,
    cameras: {
      playerCamera,
      impactCamera,
      renderCamera,
    },
  }
}
