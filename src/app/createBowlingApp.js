import { DOMInterface } from "/src/UI/DOMInterface.js";
import {
  createRenderSettings,
  PIN_FALL_SOUND_COOLDOWN_MS,
  SOUND_PATHS,
} from "/src/config/simulationConfig.js";
import {
  createLighting,
  configureShadowLight,
} from "/src/scene/createLighting.js";
import { addLaneToScene } from "/src/scene/createLane.js";
import { createCinematicHall } from "/src/scene/createHall.js";
import { createModelManager } from "/src/scene/loadModels.js";
import { createRendererScene } from "/src/scene/createRendererScene.js";
import { createSceneMaterials } from "/src/scene/createMaterials.js";
import { bindControls } from "/src/systems/bindControls.js";
import { createAudioSystem } from "/src/systems/createAudioSystem.js";
import { createCameraSystem } from "/src/systems/createCameraSystem.js";
import { createSimulationController } from "/src/systems/createSimulationController.js";

// ============================================================
// مسؤولية العضو 1: تجميع التطبيق
// ركز هنا لفهم ترتيب تشغيل الأنظمة: مشهد، إضاءة، خامات، صالة، مسار، نماذج، واجهة، صوت، كاميرا، ومحاكاة.
// كل عضو يرجع من هذا الملف إلى ملفه المتخصص بدل البحث داخل main.js.
// ============================================================

export function createBowlingApp() {
  // نقطة التجميع الوحيدة: تنشئ الأنظمة وتربطها بدون تفاصيل بناء داخل main.js.
  const renderSettings = createRenderSettings();
  const rendererScene = createRendererScene(renderSettings);
  const { scene, renderer, composer, bloomPass, cameras } = rendererScene;

  createLighting({ scene, renderer });

  const materials = createSceneMaterials();
  scene.add(createCinematicHall({ materials, configureShadowLight }));
  addLaneToScene(scene, materials);

  const models = createModelManager(scene);
  const ui = new DOMInterface(renderSettings);
  const audio = createAudioSystem({
    soundPaths: SOUND_PATHS,
    pinFallCooldownMs: PIN_FALL_SOUND_COOLDOWN_MS,
  });
  const cameraSystem = createCameraSystem({ cameras });

  const controller = createSimulationController({
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
  });

  bindControls({
    ui,
    app: controller,
    setCameraMode: cameraSystem.setCameraMode,
    applyRenderSettings: controller.applyRenderSettings,
  });

  return controller;
}
