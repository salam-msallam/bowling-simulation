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
// مسؤولية العضو 6: حلقة المحاكاة وحالة الجولة
// ركز هنا لفهم ترتيب كل frame: احتكاك، تحديث فيزياء، تصادمات، مزامنة Meshes، HUD، كاميرا، ثم render.
// هذا الملف هو حلقة الربط بين الأعضاء: يستخدم فيزياء العضو 2، تصادمات العضو 3، مشهد العضو 4، وواجهة العضو 5.
// ============================================================

function pinStateDelta(a, b) {
  // يقيس أكبر فرق بين حالتين للدبوس لمعرفة هل توقفت الحركة تقريباً.
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
  // هذا هو قلب اللعبة: يربط الفيزياء بالمشهد ويشغل الحلقة الرئيسية بدون بناء مجسمات جديدة.
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
    // يأخذ مكان الكرة على المسار ويعيد mu من نمط الزيت الحالي.
    return currentOilZone.getMu(z);
  }

  function syncBall() {
    // ينسخ حالة الكرة الفيزيائية إلى المجسم المرئي.
    const state = ballPhysics.getState();
    models.ballMesh.position.set(
      state.position.x,
      BALL_RADIUS,
      state.position.z,
    );
    models.ballVisualRoot.rotation.copy(state.rotation);
  }

  function syncPins() {
    // ينسخ حالات الدبابيس الفيزيائية إلى مجموعات الدبابيس المرئية.
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
    // مزامنة أولية بعد التحميل أو reset حتى لا تظهر المجسمات في أماكن قديمة.
    syncBall();
    syncPins();
  }

  function checkCollisions() {
    // يفحص التصادمات ثم يشغل صوت سقوط الدبوس عند تغير حالته من واقف إلى ساقط.
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
    // يقارن حالة الدبابيس بين إطارين متتاليين لمعرفة هل انتهت الحركة.
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
    // يقرر نهاية الرمية عند توقف الكرة والدبابيس، أو بعد مهلة احتياطية عند نهاية المسار.
    const ball = ballPhysics.getState();
    const pins = pinPhysics.getStates();
    const ballAtRest = ball.phase === "stopped" || ball.speed <= 0.01;
    const pinsAtRest = arePinsAtRest(pins);
    const reachedEnd = ball.position.z >= LANE_END_Z - 0.05;

    if (ballAtRest && pinsAtRest) {
      settleFrameCount += 1;
    } else {
      settleFrameCount = 0;
    }

    if (ballAtRest || reachedEnd) {
      summaryFallbackFrameCount += 1;
    } else {
      summaryFallbackFrameCount = 0;
    }

    return (
      (ballAtRest && pinsAtRest && settleFrameCount >= SETTLE_FRAME_DELAY) ||
      summaryFallbackFrameCount >= SUMMARY_FALLBACK_FRAME_DELAY
    );
  }

  function showSimulationSummary() {
    // يعرض ملخص النتيجة مرة واحدة فقط بعد استقرار الرمية.
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
    // يعيد كل عدادات الجولة والفيزياء والصوت والكاميرا إلى بداية رمية نظيفة.
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
    // يطبق إعدادات جودة الرندر القادمة من DOMInterface على renderer وbloomPass.
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
    const z = ball.position.z;
    const patternEnd = currentOilZone.getOilEnd();
    const muK = getCurrentFriction(z);
    // أضيفي هذا السطر داخل دالة updateSimulationHUD في createSimulationController.js
    console.log(
      "الجاذبية الحالية تؤثر على الاحتكاك بقوة:",
      ballPhysics.g * BALL_MASS,
    );
    ui.updateHUD(
      ball.speed,
      ball.angularSpeed,
      ball.phase,
      muK,
      z,
      activeFrameCount,
      patternEnd,
    );
  }

  function renderFrame() {
    // يختار بين composer مع Bloom أو renderer مباشر حسب إعدادات الواجهة.
    if (renderSettings.bloom) {
      composer.render();
    } else {
      renderer.render(scene, cameras.renderCamera);
    }
  }

  function gameLoop(currentTime) {
    // الحلقة الرئيسية: requestAnimationFrame يعيد استدعاءها كل frame.
    requestAnimationFrame(gameLoop);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    if (isRunning) {
      // لا نحرك الفيزياء إلا أثناء الرمية، لكن الكاميرا والHUD يظلان محدثين.
      activeFrameCount += 1;
      // داخل gameLoop في createSimulationController.js
      if (isRunning) {
        const gravity = ui.getInputs().gravity;

        // تحديث الكرة
        ballPhysics.g = gravity;

        // تحديث الدبابيس (بعد التعديل أعلاه)
        pinPhysics.setGravity(gravity);

        // ...
      }
      const ballStateBeforeUpdate = ballPhysics.getState();
      const currentMu = getCurrentFriction(ballStateBeforeUpdate.position.z);

      ballPhysics.update(dt, currentMu);
      pinPhysics.update(dt);
      checkCollisions();
      syncBall();
      syncPins();
      audio.updateRollingBallSound(ballPhysics.getState(), isRunning);

      if (isSimulationSettled()) {
        showSimulationSummary();
      }
    }

    updateSimulationHUD();
    cameraSystem.updateCameraSystem(dt, ballPhysics.getState());
    renderFrame();
  }
  // استبدلي تعريف دالة launchBall بهذا السطر فقط:
  function launchBall(v0, angle, revRate, oilPattern, gravity) {
    // هذه هي نقطة التوفيق:
    // إذا كان v0 كائناً (من الواجهة)، فككيه. وإذا كان رقماً (من مكان آخر)، استخدميه.
    const params =
      typeof v0 === "object" ? v0 : { v0, angle, revRate, oilPattern, gravity };

    resetFrameState();

    // نستخدم القيم من الـ params المفككة
    ballPhysics.g = params.gravity !== undefined ? params.gravity : 9.81;
    currentOilPattern = params.oilPattern || "Medium";
    currentOilZone = OilZone.fromPreset(currentOilPattern);

    ballPhysics.launch(params.v0, params.angle, params.revRate);
    isRunning = true;
    audio.updateRollingBallSound(ballPhysics.getState(), isRunning);
  }
  function stopSimulation() {
    // إيقاف مؤقت بسيط للرمية بدون تغيير أماكن الكرة والدبابيس.
    isRunning = false;
    audio.stopRollingBallSound();
  }

  function resetSimulation() {
    // Reset كامل يرجع نمط الزيت إلى Medium ثم يعيد حالة الرمية.
    currentOilPattern = "Medium";
    currentOilZone = OilZone.fromPreset(currentOilPattern);
    resetFrameState();
  }

  function newFrame() {
    // إطار/محاولة جديدة بنفس إعدادات الواجهة الحالية.
    resetFrameState();
  }

  function getPhysicsState() {
    // API صغير لمن يريد قراءة حالة الفيزياء من خارج التطبيق.
    return {
      ball: ballPhysics.getState(),
      pins: pinPhysics.getStates(),
    };
  }

  function start() {
    // يبدأ التطبيق: يطبق إعدادات العرض، يزامن المجسمات، ثم يطلق الحلقة الرئيسية.
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
