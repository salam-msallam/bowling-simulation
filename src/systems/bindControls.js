// ============================================================
// مسؤولية العضو 5: ربط واجهة التحكم
// ركز هنا عند تعديل أزرار الواجهة، اختصار Space، أو مفاتيح تبديل الكاميرا 1 و3.
// ============================================================

function isTypingInControl(target) {
  // إذا كان المستخدم يكتب داخل عنصر تحكم فلا نعتبر Space أمر إطلاق.
  const tagName = target?.tagName?.toLowerCase()
  return target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button'
}

export function bindControls({ ui, app, setCameraMode, applyRenderSettings }) {
  // هذا الملف يربط واجهة lil-gui واختصارات لوحة المفاتيح بأوامر التطبيق فقط.
  ui.onLaunch(({ v0, angle, revRate, oilPattern }) => {
    // زر Launch يرسل قيم الواجهة الحالية إلى منطق المحاكاة.
    app.launchBall(v0, angle, revRate, oilPattern)
  })

  ui.onReset(() => {
    // Reset يرجع النمط الافتراضي وحالة الجولة بالكامل.
    app.resetSimulation()
  })

  ui.onNewFrame(() => {
    // New Frame يعيد حالة الرمية بدون تغيير إعدادات الواجهة الحالية.
    app.newFrame()
  })

  if (ui.onRenderSettingsChange) {
    ui.onRenderSettingsChange(applyRenderSettings)
  }

  if (ui.onCameraModeChange) {
    ui.onCameraModeChange(setCameraMode)
  }

  window.addEventListener('keydown', (event) => {
    // اختصارات الكيبورد تعمل عالمياً، لكن Space يتوقف إذا كان المستخدم داخل input.
    if (event.repeat) return
    if (event.key === '1') setCameraMode('player')
    if (event.key === '3') setCameraMode('impact')

    if (event.code === 'Space' && !isTypingInControl(event.target)) {
      event.preventDefault()
      const { v0, angle, revRate, oilPattern } = ui.getInputs()
      app.launchBall(v0, angle, revRate, oilPattern)
    }
  }, true)
}
