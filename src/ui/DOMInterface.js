import GUI from 'lil-gui';

export class DOMInterface {
  constructor(renderSettings = {}) {
    this.launchCallback = null;
    this.resetCallback = null;
    this.newFrameCallback = null;
    this.renderSettingsCallback = null;
    this.cameraModeCallback = null;

    this.inputs = {
      v0: 7.5,
      angle: 0,
      revRate: 250,
      oilPattern: 'Medium',
    };

    this.renderSettings = {
      bloom: renderSettings.bloom ?? true,
      bloomStrength: renderSettings.bloomStrength ?? 0.38,
      bloomRadius: renderSettings.bloomRadius ?? 0.38,
      bloomThreshold: renderSettings.bloomThreshold ?? 0.72,
      exposure: renderSettings.exposure ?? 1.08,
      shadows: renderSettings.shadows ?? true,
    };

    this.hudData = {
      speed: '0.00 m/s',
      angularVelocity: '0.00 rad/s',
      phase: 'idle',
      friction: '0.05',
      displacement: '0.00 m',
      oilPatternEnd: '12.00 m',
      frameCount: 0,
      Launch: () => this.triggerLaunch(),
      Reset: () => this.triggerReset(),
    };

    this.summaryData = {
      pins: '0 / 10',
      finalVelocity: '0.00 m/s',
      finalOil: 'Medium',
      'New Frame': () => this.triggerNewFrame(),
      'Summary Reset': () => this.triggerReset(),
    };

    this.cameraActions = {
      'Player View': () => this.triggerCameraMode('player'),
      'Impact View': () => this.triggerCameraMode('impact'),
    };

    this.initGUI();
  }

  initGUI() {
    this.guiControls = new GUI({ title: 'Bowling Simulation' });
    this.guiControls.domElement.style.position = 'fixed';
    this.guiControls.domElement.style.left = '18px';
    this.guiControls.domElement.style.right = 'auto';
    this.guiControls.domElement.style.top = '18px';
    this.guiControls.domElement.style.zIndex = '100';
    this.guiControls.domElement.style.setProperty('--background-color', 'rgba(8, 11, 18, 0.92)');
    this.guiControls.domElement.style.setProperty('--widget-color', '#172033');
    this.guiControls.domElement.style.setProperty('--text-color', '#e5e7eb');
    this.guiControls.domElement.style.setProperty('--title-background-color', '#0b1220');

    const launchFolder = this.guiControls.addFolder('Launch');
    launchFolder.add(this.inputs, 'v0', 5, 10, 0.1).name('Velocity');
    launchFolder.add(this.inputs, 'angle', -5, 5, 0.1).name('Angle (deg)');
    launchFolder.add(this.inputs, 'revRate', 0, 400, 10).name('Rev Rate');
    launchFolder.add(this.hudData, 'Launch').name('Launch Ball');
    launchFolder.add(this.hudData, 'Reset').name('Reset');
    launchFolder.open();

    const oilFolder = this.guiControls.addFolder('Oil Pattern');
    oilFolder
      .add(this.inputs, 'oilPattern', ['Short', 'Medium', 'Long'])
      .name('Pattern')
      .onChange((value) => {
        let endDist = 12;
        if (value === 'Short') endDist = 9;
        if (value === 'Long') endDist = 15;
        this.updateHUD(0, 0, 'idle', 0.05, 0, 0, endDist);
      });
    oilFolder.open();

    const cameraFolder = this.guiControls.addFolder('Camera');
    cameraFolder.add(this.cameraActions, 'Player View').name('1 - Player View');
    cameraFolder.add(this.cameraActions, 'Impact View').name('3 - Impact View');
    cameraFolder.open();

    const renderFolder = this.guiControls.addFolder('Render Quality');
    renderFolder.add(this.renderSettings, 'bloom').name('Bloom').onChange(() => this.emitRenderSettings());
    renderFolder.add(this.renderSettings, 'bloomStrength', 0, 1.6, 0.01).name('Bloom Strength').onChange(() => this.emitRenderSettings());
    renderFolder.add(this.renderSettings, 'bloomRadius', 0, 1, 0.01).name('Bloom Radius').onChange(() => this.emitRenderSettings());
    renderFolder.add(this.renderSettings, 'bloomThreshold', 0, 1, 0.01).name('Bloom Threshold').onChange(() => this.emitRenderSettings());
    renderFolder.add(this.renderSettings, 'exposure', 0.55, 1.8, 0.01).name('Exposure').onChange(() => this.emitRenderSettings());
    renderFolder.add(this.renderSettings, 'shadows').name('Shadows').onChange(() => this.emitRenderSettings());

    this.guiHUD = new GUI({ title: 'Live HUD' });
    this.guiHUD.domElement.style.position = 'fixed';
    this.guiHUD.domElement.style.right = '18px';
    this.guiHUD.domElement.style.top = '18px';
    this.guiHUD.domElement.style.zIndex = '100';
    this.guiHUD.domElement.style.setProperty('--background-color', 'rgba(8, 11, 18, 0.86)');
    this.guiHUD.domElement.style.setProperty('--widget-color', '#172033');
    this.guiHUD.domElement.style.setProperty('--text-color', '#e5e7eb');
    this.guiHUD.domElement.style.setProperty('--title-background-color', '#0b1220');

    const hudFolder = this.guiHUD.addFolder('Ball State');
    this.controllersHUD = {
      speed: hudFolder.add(this.hudData, 'speed').name('Speed').disable(),
      angularVelocity: hudFolder.add(this.hudData, 'angularVelocity').name('Angular Vel').disable(),
      phase: hudFolder.add(this.hudData, 'phase').name('Phase').disable(),
      friction: hudFolder.add(this.hudData, 'friction').name('Friction').disable(),
      displacement: hudFolder.add(this.hudData, 'displacement').name('Distance').disable(),
      oilPatternEnd: hudFolder.add(this.hudData, 'oilPatternEnd').name('Oil End').disable(),
      frameCount: hudFolder.add(this.hudData, 'frameCount').name('Frames').disable(),
    };
    hudFolder.open();

    this.guiSummary = new GUI({ title: 'Simulation Summary' });
    this.guiSummary.domElement.style.position = 'fixed';
    this.guiSummary.domElement.style.left = '50%';
    this.guiSummary.domElement.style.top = '50%';
    this.guiSummary.domElement.style.transform = 'translate(-50%, -50%)';
    this.guiSummary.domElement.style.zIndex = '1000';
    this.guiSummary.domElement.style.setProperty('--background-color', 'rgba(8, 11, 18, 0.94)');

    this.guiSummary.add(this.summaryData, 'pins').name('Pins Down').disable();
    this.guiSummary.add(this.summaryData, 'finalVelocity').name('Final Speed').disable();
    this.guiSummary.add(this.summaryData, 'finalOil').name('Pattern Used').disable();
    this.guiSummary.add(this.summaryData, 'New Frame');
    this.guiSummary.add(this.summaryData, 'Summary Reset');
    this.guiSummary.hide();
  }

  getInputs() {
    return {
      v0: this.inputs.v0,
      angle: this.inputs.angle,
      revRate: this.inputs.revRate,
      oilPattern: this.inputs.oilPattern,
    };
  }

  onLaunch(callback) { this.launchCallback = callback; }
  onReset(callback) { this.resetCallback = callback; }
  onNewFrame(callback) { this.newFrameCallback = callback; }
  onCameraModeChange(callback) { this.cameraModeCallback = callback; }
  onRenderSettingsChange(callback) {
    this.renderSettingsCallback = callback;
    this.emitRenderSettings();
  }

  emitRenderSettings() {
    if (this.renderSettingsCallback) {
      this.renderSettingsCallback({ ...this.renderSettings });
    }
  }

  triggerLaunch() {
    if (this.launchCallback) this.launchCallback(this.getInputs());
  }

  triggerReset() {
    this.guiSummary.hide();
    if (this.resetCallback) this.resetCallback();
  }

  triggerNewFrame() {
    this.guiSummary.hide();
    if (this.newFrameCallback) this.newFrameCallback();
  }

  triggerCameraMode(mode) {
    if (this.cameraModeCallback) this.cameraModeCallback(mode);
  }

  updateHUD(v, w, phase, muK, x, frameCount, oilPatternEnd = 12) {
    this.hudData.speed = `${v.toFixed(2)} m/s`;
    this.hudData.angularVelocity = `${w.toFixed(2)} rad/s`;
    this.hudData.phase = String(phase ?? 'idle');
    this.hudData.friction = muK.toFixed(2);
    this.hudData.displacement = `${x.toFixed(2)} m`;
    this.hudData.frameCount = Math.trunc(frameCount);
    this.hudData.oilPatternEnd = `${oilPatternEnd.toFixed(2)} m`;

    for (const key in this.controllersHUD) {
      this.controllersHUD[key].updateDisplay();
    }
  }

  showSummary({ pinsKnockedDown, finalBallVelocity, oilPatternName }) {
    this.summaryData.pins = `${Math.trunc(pinsKnockedDown)} / 10`;
    this.summaryData.finalVelocity = `${finalBallVelocity.toFixed(2)} m/s`;
    this.summaryData.finalOil = String(oilPatternName ?? 'Medium');

    this.guiSummary.controllers.forEach((controller) => controller.updateDisplay());
    this.guiSummary.show();
  }

  hideSummary() {
    this.guiSummary.hide();
  }
}
