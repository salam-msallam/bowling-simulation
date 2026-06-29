// ============================================================
// مسؤولية العضو 2: فيزياء منطقة الزيت
// ركز هنا إذا كنت مسؤولاً عن: أنماط الزيت، نهاية منطقة الزيت، وكيف يتغير الاحتكاك مع تقدم الكرة.
// الملفات المرتبطة التي يجب فهمها معه: BallPhysics.js لأنه يستخدم mu، وDOMInterface.js لأنه يرسل اسم النمط المختار.
// ============================================================

class OilZone {
  constructor({ oilLength, muMin, muMax }) {
    // oilLength طول الزيت بالمتر، وmuMin/muMax أقل وأعلى احتكاك داخل النمط.
    this.oilLength = oilLength
    this.muMin = muMin
    this.muMax = muMax
  }

  static fromPreset(preset = 'Medium') {
    // يحول اسم النمط القادم من الواجهة إلى كائن OilZone جاهز للاستخدام.
    // إذا وصل اسم غير معروف نرجع إلى Medium حتى تبقى المحاكاة مستقرة.
    const settings = OilZone.presets[preset] ?? OilZone.presets.Medium
    return new OilZone(settings)
  }

  getOilEnd() {
    // يستخدمه HUD لعرض مكان نهاية الزيت للمستخدم.
    return this.oilLength
  }

  getMu(distance) {
    // يحسب معامل الاحتكاك حسب موقع الكرة على محور Z.
    // في بداية الزيت يكون الاحتكاك قريباً من muMin، وعند النهاية يصل تدريجياً إلى muMax.
    const progress = Math.min(Math.max(distance / this.oilLength, 0), 1)
    return this.muMin + (this.muMax - this.muMin) * progress
  }
}

// أنماط الزيت المتاحة في واجهة التحكم. القيم بالمتر وتؤثر مباشرة على hook وسرعة التوقف.
OilZone.presets = {
  Short: { oilLength: 9, muMin: 0.035, muMax: 0.20 },
  Medium: { oilLength: 12, muMin: 0.05, muMax: 0.20 },
  Long: { oilLength: 15, muMin: 0.065, muMax: 0.20 },
}

export default OilZone
