function isTypingInControl(target) {
  // إذا كان المستخدم يكتب داخل عنصر تحكم فلا نعتبر Space أمر إطلاق.
  const tagName = target?.tagName?.toLowerCase()
  return target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button'
}

export function bindControls({ ui, app, setCameraMode, applyRenderSettings }) {
  ui.onLaunch((inputs) => {
    app.launchBall(inputs)
  })

  ui.onReset(() => {
    app.resetSimulation()
  })

  ui.onNewFrame(() => {
    app.newFrame()
  })

  if (ui.onRenderSettingsChange) {
    ui.onRenderSettingsChange(applyRenderSettings)
  }

  if (ui.onCameraModeChange) {
    ui.onCameraModeChange(setCameraMode)
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return
    if (event.key === '1') setCameraMode('player')
    if (event.key === '3') setCameraMode('impact')

    if (event.code === 'Space' && !isTypingInControl(event.target)) {
      event.preventDefault()
      app.launchBall(ui.getInputs())
    }
  }, true)
}
