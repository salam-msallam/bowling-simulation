import * as THREE from 'three'

export function createLuxuryBowlingEnvironment(scene) {

  const envGroup = new THREE.Group()
  envGroup.name = 'LuxuryBowlingEnvironmentV2'

  const LANE_Z = [-1.5, -0.5, 0.5, 1.5]

  // ======================================
  // 1. BASE DARK CINEMA ROOM
  // ======================================
  function createBase() {
    const g = new THREE.Group()

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 20),
      new THREE.MeshStandardMaterial({
        color: 0x05070a,
        roughness: 0.15,
        metalness: 0.85
      })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.1
    g.add(floor)

    scene.background = new THREE.Color(0x05060b)
    scene.fog = new THREE.FogExp2(0x05060b, 0.03)

    return g
  }

  // ======================================
  // 2. CEILING NEON GRID (أهم عنصر)
  // ======================================
  function createCeilingGrid() {
    const g = new THREE.Group()

    const colors = [0xff0033, 0x00aaff, 0xffcc00]

    // longitudinal strips (like image red line)
    for (let i = -2; i <= 2; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(60, 0.05, 0.08),
        new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          emissive: colors[i % colors.length]
        })
      )

      line.position.set(15, 4.2, i * 1.2)
      g.add(line)
    }

    // floating neon rectangles (blue/red frames)
    for (let i = 0; i < 6; i++) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.05, 1.4),
        new THREE.MeshBasicMaterial({
          color: 0x00aaff,
          emissive: 0x00aaff
        })
      )

      frame.position.set(5 + i * 4, 4.3, (i % 2) ? 1.2 : -1.2)
      frame.rotation.y = Math.PI / 6

      g.add(frame)
    }

    return g
  }

  // ======================================
  // 3. BIG BOWLING SIGN (زي الصورة تماماً)
  // ======================================
  function createSign() {
    const g = new THREE.Group()

    const letters = "BOWLING"
    const startX = 2

    for (let i = 0; i < letters.length; i++) {
      const letter = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 2.5, 0.2),
        new THREE.MeshBasicMaterial({
          color: 0x1e6bff,
          emissive: 0x1e6bff
        })
      )

      letter.position.set(0, 3, -2.8)
      letter.position.x = startX + i * 1.2

      g.add(letter)
    }

    const light = new THREE.PointLight(0x1e6bff, 2, 50)
    light.position.set(10, 3, -2.5)
    g.add(light)

    return g
  }

  // ======================================
  // 4. UV LANE GLOW (انعكاس الأرض)
  // ======================================
  function createLaneGlow() {
    const g = new THREE.Group()

    LANE_Z.forEach(z => {
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 0.9),
        new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.08
        })
      )

      glow.rotation.x = -Math.PI / 2
      glow.position.set(15, -0.08, z)

      g.add(glow)
    })

    return g
  }

  // ======================================
  // 5. WALL LIGHT STRIP (زي الخط الأصفر بالصورة)
  // ======================================
  function createWallLight() {
    const g = new THREE.Group()

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(80, 0.08, 0.05),
      new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        emissive: 0xffcc66
      })
    )

    strip.position.set(15, 2.8, -3.2)
    g.add(strip)

    const strip2 = strip.clone()
    strip2.position.z = 3.2
    g.add(strip2)

    return g
  }

  // ======================================
  // 6. LIGHTING (بدون تعقيد زائد)
  // ======================================
  function createLight() {
    const g = new THREE.Group()

    const ambient = new THREE.AmbientLight(0x1a1f2a, 0.4)
    g.add(ambient)

    const main = new THREE.PointLight(0xffffff, 1.2, 80)
    main.position.set(10, 6, 0)
    g.add(main)

    return g
  }

  // ======================================
  // BUILD
  // ======================================
  envGroup.add(createBase())
  envGroup.add(createCeilingGrid())
  envGroup.add(createSign())
  envGroup.add(createLaneGlow())
  envGroup.add(createWallLight())
  envGroup.add(createLight())

  // ======================================
  // UPDATE (خفيف)
  // ======================================
  function update(t) {
    envGroup.rotation.y = Math.sin(t * 0.1) * 0.002
  }

  return { envGroup, update }
}