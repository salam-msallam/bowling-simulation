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
// مسؤولية العضو 6: حلقة المحاكاة وحالة الجولة (نسخة مدمجة ومصححة)
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
  let knockedPinsTracker = new Array(10).fill(false);

  function getCurrentFriction(z) {
    return currentOilZone.getMu(z);
  }

  function syncBall() {
    const state = ballPhysics.getState();
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

  function initScenePositions() {
    syncBall();
    syncPins();
  }

  function checkCollisions() {
    if (ballPhysics.getState().phase === "gutter") return;
    const beforeStates = pinPhysics.getStates();
    collisionManager.checkCollisions();
    const afterStates = pinPhysics.getStates();

    afterStates.forEach((state, index) => {
      if (beforeStates[index]?.isStanding && !state.isStanding) {
        knockedPinsTracker[index] = true;
        audio.playPinFallSound();
      }
    });
  }

  function arePinsAtRest(states) {
    if (!previousPinStates) {
      previousPinStates = states.map((state) => ({
        position: { ...state.position },
        rotation: { ...state.rotation },
      }));
      return false;
    }
    const atRest = states.every(
      (state, index) =>
        pinStateDelta(state, previousPinStates[index]) <= PIN_REST_EPSILON,
    );
    previousPinStates = states.map((state) => ({
      position: { ...state.position },
      rotation: { ...state.rotation },
    }));
    return atRest;
  }

  function isSimulationSettled() {
    const ball = ballPhysics.getState();
    const pins = pinPhysics.getStates();
    const ballAtRest = ball.phase === "stopped" || ball.speed <= 0.01;
    const pinsAtRest = arePinsAtRest(pins);
    const reachedEnd = ball.position.z >= LANE_END_Z - 0.05;

    if (ballAtRest && pinsAtRest) settleFrameCount += 1;
    else settleFrameCount = 0;
    if (ballAtRest || reachedEnd) summaryFallbackFrameCount += 1;
    else summaryFallbackFrameCount = 0;

    return (
      (ballAtRest && pinsAtRest && settleFrameCount >= SETTLE_FRAME_DELAY) ||
      summaryFallbackFrameCount >= SUMMARY_FALLBACK_FRAME_DELAY
    );
  }

  function showSimulationSummary() {
    if (summaryShown) return;
    summaryShown = true;
    isRunning = false;
    audio.stopRollingBallSound();
    ui.showSummary({
      pinsKnockedDown: pinPhysics
        .getStates()
        .filter((state) => !state.isStanding).length,
      finalBallVelocity: ballPhysics.getState().speed,
      oilPatternName: currentOilPattern,
    });
  }

  function resetFrameState() {
    isRunning = false;
    audio.stopRollingBallSound();
    audio.resetPinFallCooldown();
    knockedPinsTracker = new Array(10).fill(false);
    ballPhysics.reset();
    pinPhysics.reset();
    activeFrameCount = 0;
    settleFrameCount = 0;
    summaryFallbackFrameCount = 0;
    summaryShown = false;
    previousPinStates = null;
    initScenePositions();
    cameraSystem.resetCamera();
  }

  function applyRenderSettings(settings = renderSettings) {
    Object.assign(renderSettings, settings);
    renderer.toneMappingExposure = renderSettings.exposure;
    renderer.shadowMap.enabled = renderSettings.shadows;
    bloomPass.enabled = renderSettings.bloom;
    bloomPass.strength = renderSettings.bloomStrength;
    bloomPass.radius = renderSettings.bloomRadius;
    bloomPass.threshold = renderSettings.bloomThreshold;
  }

  function updateSimulationHUD() {
    const ball = ballPhysics.getState();
    const muK = getCurrentFriction(ball.position.z);
    const force = muK * ballPhysics.mass * ballPhysics.g;
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

  function renderFrame() {
    if (renderSettings.bloom) composer.render();
    else renderer.render(scene, cameras.renderCamera);
  }

  function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    if (isRunning) {
      activeFrameCount += 1;
      const gravity = ui.getInputs().gravity;
      ballPhysics.g = gravity;
      pinPhysics.setGravity(gravity);

      const currentMu = getCurrentFriction(ballPhysics.getState().position.z);
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
    renderFrame();
  }

  function launchBall(v0, angle, revRate, oilPattern, gravity, ballMass) {
    const params =
      typeof v0 === "object"
        ? v0
        : { v0, angle, revRate, oilPattern, gravity, ballMass };
    resetFrameState();
    ballPhysics.mass = params.ballMass ?? BALL_MASS;
    ballPhysics.g = params.gravity !== undefined ? params.gravity : 9.81;
    currentOilPattern = params.oilPattern || "Medium";
    currentOilZone = OilZone.fromPreset(currentOilPattern);
    ballPhysics.launch(params.v0, params.angle, params.revRate);
    isRunning = true;
    audio.updateRollingBallSound(ballPhysics.getState(), isRunning);
  }

  function stopSimulation() {
    isRunning = false;
    audio.stopRollingBallSound();
  }
  function resetSimulation() {
    currentOilPattern = "Medium";
    currentOilZone = OilZone.fromPreset(currentOilPattern);
    resetFrameState();
  }
  function newFrame() {
    resetFrameState();
  }
  function getPhysicsState() {
    return { ball: ballPhysics.getState(), pins: pinPhysics.getStates() };
  }

  function start() {
    applyRenderSettings();
    initScenePositions();
    requestAnimationFrame(gameLoop);
  }

  return {
    launchBall,
    stopSimulation,
    resetSimulation,
    newFrame,
    getPhysicsState,
    applyRenderSettings,
    start,
  };
}
