class OilZone {
  constructor(muMin, muMax, Loil) {
    this.muMin = muMin; // أقل احتكاك — عند بداية المسار (زيت كتير)
    this.muMax = muMax; // أكبر احتكاك — بعد الزيت (بدون زيت)
    this.Loil = Loil; // طول منطقة الزيت بالمتر
  }

  // بنبني OilZone من preset جاهز
  static fromPreset(preset) {
    const p = OilZone.presets[preset];
    return new OilZone(p.muMin, p.muMax, p.Loil);
  }

  getMu(x) {
    // لو الكرة طلعت من منطقة الزيت — muMax ثابت
    if (x >= this.Loil) return this.muMax;
    // μ(x) = μmin + (μmax - μmin)·(x/Loil)
    // يعني الاحتكاك بيزيد تدريجياً كلما تقدمت الكرة
    return this.muMin + (this.muMax - this.muMin) * (x / this.Loil);
  }
}

// 3 أنماط جاهزة
OilZone.presets = {
  Short: { Loil: 32, muMin: 0.02, muMax: 0.2 },
  Medium: { Loil: 40, muMin: 0.03, muMax: 0.18 },
  Long: { Loil: 48, muMin: 0.04, muMax: 0.15 },
};

export default OilZone;

// عند بداية المسار x=0 ← احتكاك = muMin (زيت كتير)
// كلما تقدمت ← احتكاك يزيد تدريجياً
// عند نهاية الزيت x=Loil ← احتكاك = muMax (بدون زيت)
