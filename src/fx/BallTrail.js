import * as THREE from 'three'

export class BallTrail {
  constructor({ maxPoints = 72, lifetime = 0.9 } = {}) {
    this.maxPoints = maxPoints
    this.lifetime = lifetime
    this.nextIndex = 0
    this.activeCount = 0
    this.emitAccumulator = 0
    this.emitInterval = 0.018

    this.positions = new Float32Array(maxPoints * 3)
    this.alphas = new Float32Array(maxPoints)
    this.ages = new Float32Array(maxPoints)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))
    geometry.setDrawRange(0, 0)

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        color: { value: new THREE.Color(0x65e7ff) },
        pointSize: { value: 42 },
      },
      vertexShader: `
        uniform float pointSize;
        attribute float alpha;
        varying float vAlpha;

        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (0.35 + alpha * 0.65) / max(0.8, -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float falloff = smoothstep(0.5, 0.0, length(center));
          gl_FragColor = vec4(color, vAlpha * falloff * 0.65);
        }
      `,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
  }

  addTo(scene) {
    scene.add(this.points)
  }

  update(dt, position, isEmitting) {
    this.fade(dt)

    if (isEmitting) {
      this.emitAccumulator += dt

      while (this.emitAccumulator >= this.emitInterval) {
        this.emit(position)
        this.emitAccumulator -= this.emitInterval
      }
    } else {
      this.emitAccumulator = 0
    }

    this.refreshGeometry()
  }

  emit(position) {
    const i = this.nextIndex
    const offset = i * 3

    this.positions[offset] = position.x
    this.positions[offset + 1] = position.y
    this.positions[offset + 2] = position.z
    this.ages[i] = 0
    this.alphas[i] = 1

    this.nextIndex = (this.nextIndex + 1) % this.maxPoints
    this.activeCount = Math.min(this.activeCount + 1, this.maxPoints)
  }

  fade(dt) {
    for (let i = 0; i < this.maxPoints; i += 1) {
      if (this.alphas[i] <= 0) continue

      this.ages[i] += dt
      const lifeRatio = Math.min(this.ages[i] / this.lifetime, 1)
      this.alphas[i] = 1 - lifeRatio
    }
  }

  refreshGeometry() {
    this.points.geometry.attributes.position.needsUpdate = true
    this.points.geometry.attributes.alpha.needsUpdate = true
    this.points.geometry.setDrawRange(0, this.activeCount)
  }

  clear() {
    this.nextIndex = 0
    this.activeCount = 0
    this.emitAccumulator = 0
    this.ages.fill(this.lifetime)
    this.alphas.fill(0)
    this.points.geometry.setDrawRange(0, 0)
    this.points.geometry.attributes.alpha.needsUpdate = true
  }
}