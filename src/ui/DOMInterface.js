// DOMInterface.js
// المسؤول: العضو 4 

// Use the installed Vite dependency instead of a CDN import.
import GUI from 'lil-gui';

export class DOMInterface {
  constructor() {
    this.launchCallback = null;
    this.resetCallback = null;
    this.newFrameCallback = null;

    // كائن تخزين المدخلات (السلايدرات)
    this.inputs = {
      v0: 7.5,
      angle: 0,
      revRate: 250,
      oilPattern: 'Medium'
    };

    // كائن الـ HUD والأزرار
    this.hudData = {
      speed: '0.00 m/s',
      angularVelocity: '0.00 rad/s',
      phase: 'idle',
      friction: '0.05',
      displacement: '0.00 m',
      oilPatternEnd: '12.00 m',
      frameCount: 0,
      Launch: () => this.triggerLaunch(),
      Reset: () => this.triggerReset()
    };

    this.summaryData = {
      pins: '0 / 10',
      finalVelocity: '0.00 m/s',
      finalOil: 'Medium',
      'New Frame': () => this.triggerNewFrame(),
      'Summary Reset': () => this.triggerReset()
    };

    this.initGUI();
  }

  initGUI() {
    // إنشاء القائمة الرئيسية وتثبيتها على اليسار
    this.guiControls = new GUI({ title: '🚀 Bowling Controls' });
    this.guiControls.domElement.style.position = 'fixed';
    this.guiControls.domElement.style.left = '20px';
    this.guiControls.domElement.style.right = 'auto';
    this.guiControls.domElement.style.top = '20px';
    this.guiControls.domElement.style.zIndex = '100';

    this.guiControls.add(this.inputs, 'v0', 5, 10, 0.1).name('Velocity (v0)');
    this.guiControls.add(this.inputs, 'angle', -5, 5, 0.1).name('Launch Angle');
    this.guiControls.add(this.inputs, 'revRate', 0, 400, 10).name('Rev Rate (rpm)');
    
    this.guiControls.add(this.inputs, 'oilPattern', ['Short', 'Medium', 'Long'])
      .name('Oil Pattern')
      .onChange(value => {
        let endDist = 12;
        if (value === 'Short') endDist = 9;
        if (value === 'Long') endDist = 15;
        this.updateHUD(0, 0, 'idle', 0.05, 0, 0, endDist);
      });

    this.guiControls.add(this.hudData, 'Launch').name('▶ Launch Ball');
    this.guiControls.add(this.hudData, 'Reset').name('🔄 Reset System');

    // قائمة الـ HUD وتثبيتها على اليمين
    this.guiHUD = new GUI({ title: '📊 Live HUD' });
    this.guiHUD.domElement.style.position = 'fixed';
    this.guiHUD.domElement.style.right = '20px';
    this.guiHUD.domElement.style.top = '20px';
    this.guiHUD.domElement.style.zIndex = '100';

    this.controllersHUD = {
      speed: this.guiHUD.add(this.hudData, 'speed').name('Speed').disable(),
      angularVelocity: this.guiHUD.add(this.hudData, 'angularVelocity').name('Angular Vel').disable(),
      phase: this.guiHUD.add(this.hudData, 'phase').name('Phase').disable(),
      friction: this.guiHUD.add(this.hudData, 'friction').name('Friction (µk)').disable(),
      displacement: this.guiHUD.add(this.hudData, 'displacement').name('Displacement').disable(),
      oilPatternEnd: this.guiHUD.add(this.hudData, 'oilPatternEnd').name('Oil End').disable(),
      frameCount: this.guiHUD.add(this.hudData, 'frameCount').name('Frame Counter').disable()
    };

    // قائمة الخلاصة في المنتصف
    this.guiSummary = new GUI({ title: '🏆 Simulation Summary' });
    this.guiSummary.domElement.style.position = 'fixed';
    this.guiSummary.domElement.style.left = '50%';
    this.guiSummary.domElement.style.top = '50%';
    this.guiSummary.domElement.style.transform = 'translate(-50%, -50%)';
    this.guiSummary.domElement.style.zIndex = '200';
    
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
      oilPattern: this.inputs.oilPattern
    };
  }

  onLaunch(callback) { this.launchCallback = callback; }
  onReset(callback) { this.resetCallback = callback; }
  onNewFrame(callback) { this.newFrameCallback = callback; }

  triggerLaunch() { 
    if (this.launchCallback) {
      this.launchCallback(this.getInputs()); 
    } 
  }
  
  triggerReset() { this.guiSummary.hide(); if (this.resetCallback) this.resetCallback(); }
  triggerNewFrame() { this.guiSummary.hide(); if (this.newFrameCallback) this.newFrameCallback(); }

  updateHUD(v, w, phase, muK, x, frameCount, oilPatternEnd = 12) {
    this.hudData.speed = `${v.toFixed(2)} m/s`;
    this.hudData.angularVelocity = `${w.toFixed(2)} rad/s`;
    this.hudData.phase = String(phase ?? 'idle');
    this.hudData.friction = muK.toFixed(2);
    this.hudData.displacement = `${x.toFixed(2)} m`;
    this.hudData.frameCount = Math.trunc(frameCount);
    this.hudData.oilPatternEnd = `${oilPatternEnd.toFixed(2)} m`;

    for (let key in this.controllersHUD) {
      this.controllersHUD[key].updateDisplay();
    }
  }

  showSummary({ pinsKnockedDown, finalBallVelocity, oilPatternName }) {
    this.summaryData.pins = `${Math.trunc(pinsKnockedDown)} / 10`;
    this.summaryData.finalVelocity = `${finalBallVelocity.toFixed(2)} m/s`;
    this.summaryData.finalOil = String(oilPatternName ?? 'Medium');

    this.guiSummary.controllers.forEach(c => c.updateDisplay());
    this.guiSummary.show();
  }

  hideSummary() {
    this.guiSummary.hide();
  }

  triggerCollisionParticles(position3D, createParticlesEmitter) {
    if (typeof createParticlesEmitter === 'function') {
      createParticlesEmitter(position3D);
    }
  }
}
