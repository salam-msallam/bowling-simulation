import * as THREE from 'three'
import { BALL_RADIUS, CAMERA_MODES } from '/src/config/simulationConfig.js'

// ============================================================
// مسؤولية العضو 1: نظام الكاميرات
// ركز هنا عند تعديل منظور اللاعب، منظور الاصطدام، وسلاسة الانتقال بين الكاميرات.
// ============================================================

export function createCameraSystem({ cameras }) {
  // نظام الكاميرا يملك فقط اختيار المنظور وتحديث renderCamera بسلاسة.
  const { playerCamera, impactCamera, renderCamera } = cameras
  const camTarget = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()

  let activeCameraMode = CAMERA_MODES.PLAYER
  let requestedCameraMode = CAMERA_MODES.PLAYER

  function setCameraMode(mode) {
    // يغير الكاميرا المطلوبة فقط إذا كان الاسم معروفاً.
    if (!Object.values(CAMERA_MODES).includes(mode)) return
    requestedCameraMode = mode
  }

  function updatePlayerCamera(ballPos) {
    // كاميرا اللاعب تتبع الكرة من الخلف مع متابعة خفيفة لحركة X حتى يظهر hook.
    camTarget.set(ballPos.x * 0.18, 1.35, ballPos.z - 3.35)
    playerCamera.position.lerp(camTarget, 0.12)
    lookTarget.set(ballPos.x, ballPos.y + 0.08, ballPos.z + 2.7)
    playerCamera.lookAt(lookTarget)
  }

  function updateImpactCamera(ballPos) {
    // كاميرا الاصطدام تثبت خلف الدبابيس وتنظر باتجاه الكرة القادمة.
    impactCamera.position.set(0, 2.35, 19.15)
    impactCamera.up.set(0, 1, 0)
    impactCamera.lookAt(ballPos.x * 0.3, 0.38, Math.min(ballPos.z, 17.2))
  }

  function updateCameraSystem(dt, ballState) {
    // يحدث الكاميرات المصدر أولاً، ثم يحرك renderCamera بسلاسة نحو الكاميرا المطلوبة.
    const ballPos = new THREE.Vector3(ballState.position.x, BALL_RADIUS, ballState.position.z)
    activeCameraMode = requestedCameraMode

    updatePlayerCamera(ballPos)
    updateImpactCamera(ballPos)

    const sourceCamera = activeCameraMode === CAMERA_MODES.IMPACT ? impactCamera : playerCamera
    const transitionAlpha = 1 - Math.exp(-dt * 5.5)
    renderCamera.position.lerp(sourceCamera.position, transitionAlpha)
    renderCamera.quaternion.slerp(sourceCamera.quaternion, transitionAlpha)
    renderCamera.fov = THREE.MathUtils.lerp(renderCamera.fov, sourceCamera.fov, transitionAlpha)
    renderCamera.updateProjectionMatrix()
  }

  function resetCamera() {
    // يرجع الكاميرا لمنظور اللاعب عند reset أو بداية رمية جديدة.
    setCameraMode(CAMERA_MODES.PLAYER)
    renderCamera.position.set(0, 1.8, -2.8)
    renderCamera.lookAt(0, 0.18, 9)
  }

  return {
    setCameraMode,
    updateCameraSystem,
    resetCamera,
  }
}
