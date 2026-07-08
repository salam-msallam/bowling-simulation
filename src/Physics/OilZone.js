class OilZone {
  constructor({ oilLength, muMin, muMax }) {
    this.oilLength = oilLength
    this.muMin = muMin
    this.muMax = muMax
  }

  static fromPreset(preset = 'Medium') {
    const settings = OilZone.presets[preset] ?? OilZone.presets.Medium
    return new OilZone(settings)
  }

  getOilEnd() {
    return this.oilLength
  }

  getMu(distance) {
    const progress = Math.min(Math.max(distance / this.oilLength, 0), 1)
    return this.muMin + (this.muMax - this.muMin) * progress
  }
}

// Oil length is in meters. Higher mu values increase hook and slow the ball sooner.
OilZone.presets = {
  Short: { oilLength: 9, muMin: 0.035, muMax: 0.20 },
  Medium: { oilLength: 12, muMin: 0.05, muMax: 0.20 },
  Long: { oilLength: 15, muMin: 0.065, muMax: 0.20 },
}

export default OilZone
