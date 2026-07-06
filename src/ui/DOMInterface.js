import GUI from "lil-gui";

// ============================================================
// مسؤولية العضو 5: واجهة التحكم والـ HUD
// هذا الملف يبني لوحة lil-gui: إعدادات الرمية، نمط الزيت، الكاميرا، جودة الرندر،
// حالة الكرة الحية، وملخص النتيجة. لا يحتوي فيزياء؛ فقط يرسل callbacks إلى main.js.
// ============================================================

// هذه الكلاس مسؤولة فقط عن واجهة التحكم والـ HUD.
// لا تحتوي فيزياء أو Three.js مباشرة؛ هي ترسل أحداث إلى main.js عبر callbacks.
export class DOMInterface {
  constructor(renderSettings = {}) {
    // الكولباكات يتم تسجيلها من main.js حتى تبقى الواجهة مفصولة عن منطق المحاكاة.
    this.launchCallback = null;
    this.resetCallback = null;
    this.newFrameCallback = null;
    this.renderSettingsCallback = null;
    this.cameraModeCallback = null;

    // قيم الرمية التي يغيرها المستخدم من لوحة Launch.
    this.inputs = {
      v0: 7.5,
      angle: 0,
      revRate: 250,
      oilPattern: "Medium",
      gravity: 9.81, // أضفناها هنا
    };

    // إعدادات الرندر تبدأ من main.js، ثم يمكن تعديلها مباشرة من واجهة Render Quality.
    this.renderSettings = {
      bloom: renderSettings.bloom ?? true,
      bloomStrength: renderSettings.bloomStrength ?? 0.38,
      bloomRadius: renderSettings.bloomRadius ?? 0.38,
      bloomThreshold: renderSettings.bloomThreshold ?? 0.72,
      exposure: renderSettings.exposure ?? 1.08,
      shadows: renderSettings.shadows ?? true,
    };

    // بيانات الـ HUD الحي؛ القيم نصية لأنها تعرض مباشرة داخل lil-gui.
    this.hudData = {
      speed: "0.00 m/s",
      angularVelocity: "0.00 rad/s",
      phase: "idle",
      friction: "0.05",
      displacement: "0.00 m",
      oilPatternEnd: "12.00 m",
      frameCount: 0,
      Launch: () => this.triggerLaunch(),
      Reset: () => this.triggerReset(),
    };

    // بيانات ملخص الرمية تظهر بعد انتهاء الحركة واستقرار الدبابيس.
    this.summaryData = {
      pins: "0 / 10",
      finalVelocity: "0.00 m/s",
      finalOil: "Medium",
      "New Frame": () => this.triggerNewFrame(),
      "Summary Reset": () => this.triggerReset(),
    };

    // أزرار تغيير الكاميرا؛ الاختصارات نفسها موجودة أيضاً في main.js عبر لوحة المفاتيح.
    this.cameraActions = {
      "Player View": () => this.triggerCameraMode("player"),
      "Impact View": () => this.triggerCameraMode("impact"),
    };

    this.initGUI();
  }

  initGUI() {
    // لوحة التحكم الرئيسية: إطلاق الكرة، اختيار الزيت، الكاميرا، وجودة الرندر.
    this.guiControls = new GUI({ title: "Bowling Simulation" });
    this.guiControls.domElement.style.position = "fixed";
    this.guiControls.domElement.style.left = "18px";
    this.guiControls.domElement.style.right = "auto";
    this.guiControls.domElement.style.top = "18px";
    this.guiControls.domElement.style.zIndex = "100";
    this.guiControls.domElement.style.setProperty(
      "--background-color",
      "rgba(8, 11, 18, 0.92)",
    );
    this.guiControls.domElement.style.setProperty("--widget-color", "#172033");
    this.guiControls.domElement.style.setProperty("--text-color", "#e5e7eb");
    this.guiControls.domElement.style.setProperty(
      "--title-background-color",
      "#0b1220",
    );

    const launchFolder = this.guiControls.addFolder("Launch");
    // هذه القيم تتحول لاحقاً إلى سرعة وزاوية ودوران داخل BallPhysics.
    launchFolder.add(this.inputs, "v0", 5, 10, 0.1).name("Velocity");
    launchFolder.add(this.inputs, "angle", -5, 5, 0.1).name("Angle (deg)");
    launchFolder.add(this.inputs, "revRate", 0, 400, 10).name("Rev Rate");
    launchFolder.add(this.inputs, "gravity", 1, 20, 0.1).name("Gravity");
    launchFolder.add(this.hudData, "Launch").name("Launch Ball");
    launchFolder.add(this.hudData, "Reset").name("Reset");
    launchFolder.open();

    const oilFolder = this.guiControls.addFolder("Oil Pattern");
    oilFolder
      .add(this.inputs, "oilPattern", ["Short", "Medium", "Long"])
      .name("Pattern")
      .onChange((value) => {
        // نحدث قراءة نهاية الزيت فوراً حتى يفهم المستخدم أثر النمط قبل إطلاق الكرة.
        let endDist = 12;
        if (value === "Short") endDist = 9;
        if (value === "Long") endDist = 15;
        this.updateHUD(0, 0, "idle", 0.05, 0, 0, endDist);
      });
    oilFolder.open();

    const cameraFolder = this.guiControls.addFolder("Camera");
    // أزرار الكاميرا مفيدة لمن لا يستخدم اختصارات لوحة المفاتيح.
    cameraFolder.add(this.cameraActions, "Player View").name("1 - Player View");
    cameraFolder.add(this.cameraActions, "Impact View").name("3 - Impact View");
    cameraFolder.open();

    const renderFolder = this.guiControls.addFolder("Render Quality");
    // كل تغيير هنا يرسل نسخة جديدة من الإعدادات إلى main.js لتحديث renderer/composer.
    renderFolder
      .add(this.renderSettings, "bloom")
      .name("Bloom")
      .onChange(() => this.emitRenderSettings());
    renderFolder
      .add(this.renderSettings, "bloomStrength", 0, 1.6, 0.01)
      .name("Bloom Strength")
      .onChange(() => this.emitRenderSettings());
    renderFolder
      .add(this.renderSettings, "bloomRadius", 0, 1, 0.01)
      .name("Bloom Radius")
      .onChange(() => this.emitRenderSettings());
    renderFolder
      .add(this.renderSettings, "bloomThreshold", 0, 1, 0.01)
      .name("Bloom Threshold")
      .onChange(() => this.emitRenderSettings());
    renderFolder
      .add(this.renderSettings, "exposure", 0.55, 1.8, 0.01)
      .name("Exposure")
      .onChange(() => this.emitRenderSettings());
    renderFolder
      .add(this.renderSettings, "shadows")
      .name("Shadows")
      .onChange(() => this.emitRenderSettings());

    // لوحة HUD منفصلة على يمين الشاشة حتى تبقى قراءة حالة الكرة ظاهرة أثناء اللعب.
    this.guiHUD = new GUI({ title: "Live HUD" });
    this.guiHUD.domElement.style.position = "fixed";
    this.guiHUD.domElement.style.right = "18px";
    this.guiHUD.domElement.style.top = "18px";
    this.guiHUD.domElement.style.zIndex = "100";
    this.guiHUD.domElement.style.setProperty(
      "--background-color",
      "rgba(8, 11, 18, 0.86)",
    );
    this.guiHUD.domElement.style.setProperty("--widget-color", "#172033");
    this.guiHUD.domElement.style.setProperty("--text-color", "#e5e7eb");
    this.guiHUD.domElement.style.setProperty(
      "--title-background-color",
      "#0b1220",
    );

    const hudFolder = this.guiHUD.addFolder("Ball State");
    // controllersHUD محفوظة حتى نستطيع تحديث العرض يدوياً بعد تغيير القيم النصية.
    this.controllersHUD = {
      speed: hudFolder.add(this.hudData, "speed").name("Speed").disable(),
      angularVelocity: hudFolder
        .add(this.hudData, "angularVelocity")
        .name("Angular Vel")
        .disable(),
      phase: hudFolder.add(this.hudData, "phase").name("Phase").disable(),
      friction: hudFolder
        .add(this.hudData, "friction")
        .name("Friction")
        .disable(),
      displacement: hudFolder
        .add(this.hudData, "displacement")
        .name("Distance")
        .disable(),
      oilPatternEnd: hudFolder
        .add(this.hudData, "oilPatternEnd")
        .name("Oil End")
        .disable(),
      frameCount: hudFolder
        .add(this.hudData, "frameCount")
        .name("Frames")
        .disable(),
    };
    hudFolder.open();

    // لوحة الملخص تظهر في الوسط فقط عند انتهاء الرمية، وتختفي عند reset أو frame جديد.
    this.guiSummary = new GUI({ title: "Simulation Summary" });
    this.guiSummary.domElement.style.position = "fixed";
    this.guiSummary.domElement.style.left = "50%";
    this.guiSummary.domElement.style.top = "50%";
    this.guiSummary.domElement.style.transform = "translate(-50%, -50%)";
    this.guiSummary.domElement.style.zIndex = "1000";
    this.guiSummary.domElement.style.setProperty(
      "--background-color",
      "rgba(8, 11, 18, 0.94)",
    );

    this.guiSummary.add(this.summaryData, "pins").name("Pins Down").disable();
    this.guiSummary
      .add(this.summaryData, "finalVelocity")
      .name("Final Speed")
      .disable();
    this.guiSummary
      .add(this.summaryData, "finalOil")
      .name("Pattern Used")
      .disable();
    this.guiSummary.add(this.summaryData, "New Frame");
    this.guiSummary.add(this.summaryData, "Summary Reset");
    this.guiSummary.hide();
  }

  getInputs() {
    // main.js يقرأ نسخة نظيفة من المدخلات بدل الوصول المباشر إلى كائن الواجهة.
    return {
      v0: this.inputs.v0,
      angle: this.inputs.angle,
      revRate: this.inputs.revRate,
      oilPattern: this.inputs.oilPattern,
      gravity: this.inputs.gravity, // أضفناها
    };
  }

  // دوال التسجيل التالية تجعل main.js يحدد ماذا يحدث عند ضغط أزرار الواجهة.
  onLaunch(callback) {
    this.launchCallback = callback;
  }
  onReset(callback) {
    this.resetCallback = callback;
  }
  onNewFrame(callback) {
    this.newFrameCallback = callback;
  }
  onCameraModeChange(callback) {
    this.cameraModeCallback = callback;
  }
  onRenderSettingsChange(callback) {
    this.renderSettingsCallback = callback;
    // نرسل الإعدادات فور التسجيل حتى يبدأ renderer بالقيم المتزامنة مع الواجهة.
    this.emitRenderSettings();
  }

  emitRenderSettings() {
    // نرسل نسخة من الإعدادات حتى لا يعدل main.js الكائن الداخلي مباشرة.
    if (this.renderSettingsCallback) {
      this.renderSettingsCallback({ ...this.renderSettings });
    }
  }

  triggerLaunch() {
    // عند الإطلاق نقرأ القيم الحالية ونمررها لمنطق المحاكاة.
    if (this.launchCallback) this.launchCallback(this.getInputs());
  }

  triggerReset() {
    // أي reset يخفي الملخص أولاً حتى لا يبقى فوق المشهد بعد إعادة المحاكاة.
    this.guiSummary.hide();
    if (this.resetCallback) this.resetCallback();
  }

  triggerNewFrame() {
    // frame جديد يعني نفس إعادة الضبط لكن مع نية بدء محاولة جديدة.
    this.guiSummary.hide();
    if (this.newFrameCallback) this.newFrameCallback();
  }

  triggerCameraMode(mode) {
    // الواجهة لا تتحقق من الكاميرا؛ main.js يقرر إن كان mode صالحاً.
    if (this.cameraModeCallback) this.cameraModeCallback(mode);
  }

  updateHUD(v, w, phase, muK, x, frameCount, oilPatternEnd = 12) {
    // تحويل القيم الرقمية إلى نصوص مقروءة قبل عرضها داخل lil-gui.
    this.hudData.speed = `${v.toFixed(2)} m/s`;
    this.hudData.angularVelocity = `${w.toFixed(2)} rad/s`;
    this.hudData.phase = String(phase ?? "idle");
    this.hudData.friction = muK.toFixed(2);
    this.hudData.displacement = `${x.toFixed(2)} m`;
    this.hudData.frameCount = Math.trunc(frameCount);
    this.hudData.oilPatternEnd = `${oilPatternEnd.toFixed(2)} m`;

    for (const key in this.controllersHUD) {
      // lil-gui لا يعرف أن النص تغير إلا بعد updateDisplay.
      this.controllersHUD[key].updateDisplay();
    }
  }

  showSummary({ pinsKnockedDown, finalBallVelocity, oilPatternName }) {
    // ملخص الرمية يعرض النتيجة النهائية بعد أن يقرر main.js أن المحاكاة استقرت.
    this.summaryData.pins = `${Math.trunc(pinsKnockedDown)} / 10`;
    this.summaryData.finalVelocity = `${finalBallVelocity.toFixed(2)} m/s`;
    this.summaryData.finalOil = String(oilPatternName ?? "Medium");

    this.guiSummary.controllers.forEach((controller) =>
      controller.updateDisplay(),
    );
    this.guiSummary.show();
  }

  hideSummary() {
    // دالة صغيرة للاستخدام الخارجي إذا احتجنا إخفاء الملخص بدون reset كامل.
    this.guiSummary.hide();
  }
}
