import * as THREE from 'three'

// ============================================================
// مسؤولية العضو 6: الصوت
// ركز هنا عند تعديل صوت تدحرج الكرة، صوت سقوط الدبابيس، مستوى الصوت، أو منع تكرار الصوت بسرعة.
// ============================================================

export function createAudioSystem({ soundPaths, pinFallCooldownMs }) {
  // نظام الصوت معزول هنا: صوت الكرة حلقة مستمرة، وصوت الدبابيس يعاد استخدامه بعدة نسخ.
  const rollingBallSound = new Audio(soundPaths.rollingBall)
  rollingBallSound.preload = 'auto'
  rollingBallSound.loop = true
  rollingBallSound.volume = 0

  const pinFallSounds = Array.from({ length: 4 }, () => {
    const sound = new Audio(soundPaths.pinFall)
    sound.preload = 'auto'
    sound.volume = 0.8
    return sound
  })

  let lastPinFallSoundTime = 0

  function playSound(sound) {
    // قد يمنع المتصفح الصوت قبل أول تفاعل؛ نتجاهل الخطأ حتى لا تتوقف المحاكاة.
    sound.play().catch(() => {})
  }

  function stopRollingBallSound() {
    rollingBallSound.pause()
    rollingBallSound.currentTime = 0
    rollingBallSound.volume = 0
  }

  function updateRollingBallSound(ballState, isRunning) {
    if (!isRunning || ballState.phase === 'idle' || ballState.phase === 'stopped' || ballState.speed <= 0.04) {
      stopRollingBallSound()
      return
    }

    rollingBallSound.volume = THREE.MathUtils.clamp(ballState.speed / 9, 0.14, 0.55)
    rollingBallSound.playbackRate = THREE.MathUtils.clamp(0.75 + ballState.speed / 14, 0.75, 1.25)

    if (rollingBallSound.paused) {
      playSound(rollingBallSound)
    }
  }

  function playPinFallSound() {
    const now = performance.now()
    if (now - lastPinFallSoundTime < pinFallCooldownMs) return
    lastPinFallSoundTime = now

    const sound = pinFallSounds.find((item) => item.paused || item.ended) ?? pinFallSounds[0]
    sound.pause()
    sound.currentTime = 0
    sound.volume = 0.82
    playSound(sound)
  }

  function resetPinFallCooldown() {
    // يستخدم عند reset حتى لا يمنع cooldown القديم صوت أول سقوط في الرمية الجديدة.
    lastPinFallSoundTime = 0
  }

  return {
    stopRollingBallSound,
    updateRollingBallSound,
    playPinFallSound,
    resetPinFallCooldown,
  }
}
