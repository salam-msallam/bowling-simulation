import * as THREE from "three";
import BallPhysics from "/src/Physics/BallPhysics.js";
import OilZone from "/src/Physics/OilZone.js";
import { PinPhysics } from "/src/Physics/PinPhysics.js";
import { CollisionManager } from "/src/Physics/CollisionManager.js";
import {
  BALL_MASS,
  BALL_RADIUS,
  BALL_START_POS,
  LANE_END_Z,
  PIN_REST_EPSILON,
  PIN_VISUAL_FLOOR_OFFSET,
  SETTLE_FRAME_DELAY,
  SUMMARY_FALLBACK_FRAME_DELAY,
  GRAVITY,
} from "/src/config/simulationConfig.js";

// ============================================================
// مسؤولية العضو 6: حلقة المحاكاة وحالة الجولة (نسخة مدمجة)
// ============================================================

function pinStateDelta(a, b) {
  return Math.max(
    Math.abs(a.position.x - b.position.x),
    Math.abs(a.position.y - b.position.y),
    Math.abs(a.position.z - b.position.z),
    Math.abs(a.rotation.x - b.rotation.x),
    Math.abs(a.rotation.y - b.rotation.y),
    Math.abs(a.rotation.z - b.rotation.z),
  );
}

export function createSimulationController({
  scene,
  renderer,
  composer,
  bloomPass,
  renderSettings,
  cameras,
  models,
  audio,
  cameraSystem,
  ui,
}) {
  const ballPhysics = new BallPhysics(
    BALL_MASS,
    BALL_RADIUS,
    BALL_START_POS,
    GRAVITY,
  );
  const pinPhysics = new PinPhysics();
  const collisionManager = new CollisionManager(ballPhysics, pinPhysics);

  let lastTime = performance.now();
  let isRunning = false;
  let activeFrameCount = 0;
  let settleFrameCount = 0;
  let summaryFallbackFrameCount = 0;
  let summaryShown = false;
  let previousPinStates = null;
  let currentOilPattern = "Medium";
  let currentOilZone = OilZone.fromPreset(currentOilPattern);

  function syncBall() {
    const state = ballPhysics.getState();
    // تم الدمج: استخدام الموضع الكامل (x, y, z) من حالة الفيزياء
    models.ballMesh.position.set(
      state.position.x,
      state.position.y,
      state.position.z,
    );
    models.ballVisualRoot.rotation.copy(state.rotation);
  }

  function syncPins() {
    pinPhysics.getStates().forEach((state, index) => {
      const mesh = models.pinMeshes[index];
      const visualY = Math.max(
        0,
        state.position.y -
          0.19 +
          (state.visualLift ?? 0) +
          PIN_VISUAL_FLOOR_OFFSET,
      );
      mesh.position.set(state.position.x, visualY, state.position.z);
      mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
      mesh.visible = state.position.y > -0.08;
    });
  }

  function checkCollisions() {
    // تم الدمج: تجاهل التصادم إذا كانت الكرة في المجرى (Gutter)
    if (ballPhysics.getState().phase === "gutter") return;

    const beforeStates = pinPhysics.getStates();
    collisionManager.checkCollisions();
    const afterStates = pinPhysics.getStates();

    afterStates.forEach((state, index) => {
      if (beforeStates[index]?.isStanding && !state.isStanding) {
        audio.playPinFallSound();
      }
    });
  }

  // ... (الدوال الأخرى مثل arePinsAtRest, isSimulationSettled, showSimulationSummary تبقى كما هي) ...

  function updateSimulationHUD() {
    const ball = ballPhysics.getState();
    const muK = currentOilZone.getMu(ball.position.z);
    const force = muK * BALL_MASS * ballPhysics.g;

    ui.updateHUD(
      ball.speed,
      ball.angularSpeed,
      ball.phase,
      force,
      muK,
      ball.position.z,
      activeFrameCount,
      currentOilZone.getOilEnd(),
    );
  }

  function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    if (isRunning) {
      activeFrameCount += 1;
      // تحديث الجاذبية من الواجهة
      const gravity = ui.getInputs().gravity;
      ballPhysics.g = gravity;
      pinPhysics.setGravity(gravity);

      const currentMu = currentOilZone.getMu(ballPhysics.getState().position.z);
      ballPhysics.update(dt, currentMu);
      pinPhysics.update(dt);

      checkCollisions();
      syncBall();
      syncPins();
      audio.updateRollingBallSound(ballPhysics.getState(), isRunning);

      if (isSimulationSettled()) showSimulationSummary();
    }

    updateSimulationHUD();
    cameraSystem.updateCameraSystem(dt, ballPhysics.getState());
    if (renderSettings.bloom) composer.render();
    else renderer.render(scene, cameras.renderCamera);
  }

  // ... باقي الدوال (launchBall, resetFrameState, start) ...
}
