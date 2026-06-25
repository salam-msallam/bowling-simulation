import * as THREE from 'three'

const GRAVITY = 9.8
const DURATION = 0.6

export class CollisionParticles {
  constructor(scene, count = 30) {
    this.scene = scene
    this.count = count
    this.age = DURATION

    this.positions = new Float32Array(count * 3)
    this.velocities = Array.from({ length: count }, () => new THREE.Vector3())

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

    this.material = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.075,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.visible = false
    this.points.frustumCulled = false

    scene.add(this.points)
  }

  emit(position) {
    this.age = 0
    this.points.visible = true
    this.material.opacity = 1

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3
      this.positions[index] = position.x
      this.positions[index + 1] = position.y
      this.positions[index + 2] = position.z

      const angle = Math.random() * Math.PI * 2
      const horizontalSpeed = 0.8 + Math.random() * 1.4
      const upwardSpeed = 1.6 + Math.random() * 2.2

      this.velocities[i].set(
        Math.cos(angle) * horizontalSpeed,
        upwardSpeed,
        Math.sin(angle) * horizontalSpeed
      )
    }

    this.geometry.attributes.position.needsUpdate = true
  }

  update(dt) {
    if (!this.points.visible) return

    this.age += dt

    if (this.age >= DURATION) {
      this.material.opacity = 0
      this.points.visible = false
      return
    }

    for (let i = 0; i < this.count; i += 1) {
      const velocity = this.velocities[i]
      velocity.y -= GRAVITY * dt

      const index = i * 3
      this.positions[index] += velocity.x * dt
      this.positions[index + 1] += velocity.y * dt
      this.positions[index + 2] += velocity.z * dt
    }

    this.material.opacity = 1 - this.age / DURATION
    this.geometry.attributes.position.needsUpdate = true
  }
}
