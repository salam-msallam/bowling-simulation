import * as THREE from 'three'

class BallPhysics {
  constructor(mass, radius, position) {
    this.mass = mass
    this.radius = radius
    this.startPosition = position.clone()
    this.position = position.clone()
    this.velocity = new THREE.Vector3()
    this.angularVelocity = new THREE.Vector3()
    this.phase = 'idle'
    this.axisTilt = 0
    this.revRate = 0  
  }

  launch(v0, angle, revRate) {
    const angleRad = THREE.MathUtils.degToRad(angle)

    this.revRate = revRate
    this.position.copy(this.startPosition)
    this.velocity.set(Math.sin(angleRad) * v0, 0, Math.cos(angleRad) * v0)
    this.angularVelocity.set(0, 0, 0)
    this.axisTilt = THREE.MathUtils.degToRad(Math.min(Math.abs(revRate) * 0.08, 30))
    this.phase = 'sliding'
  }

  update(dt, mu) {
    if (this.phase === 'idle' || this.phase === 'stopped') return

    const g = 9.81
    const forwardSpeed = this.velocity.z

    if (this.phase === 'sliding') {
      const deceleration = mu * g
      this.velocity.z = Math.max(0, this.velocity.z - deceleration * dt)
      this.velocity.x *= Math.max(0, 1 - mu * dt)

      const angularAcceleration = (5 * mu * g) / (2 * this.radius)
      this.angularVelocity.x -= angularAcceleration * dt

      const rollingSpeed = Math.abs(this.angularVelocity.x) * this.radius
      if (this.velocity.z > 0 && rollingSpeed >= this.velocity.z) {
        this.angularVelocity.x = -(this.velocity.z / this.radius)
        this.phase = 'pure_rolling'
      }
    } else if (this.phase === 'pure_rolling') {
      const frictionForce = mu * this.mass * g
      const hookTorque = frictionForce * this.radius * Math.sin(this.axisTilt)

      this.velocity.x += (hookTorque / this.mass) * dt
      this.velocity.z = Math.max(0, this.velocity.z - mu * g * 0.01 * dt)
      this.angularVelocity.x = -(this.velocity.z / this.radius)
    }

    this.position.addScaledVector(this.velocity, dt)

    if (forwardSpeed <= 0.01 || this.velocity.z <= 0.01 || this.position.z >= 18.5) {
      this.velocity.set(0, 0, 0)
      this.angularVelocity.set(0, 0, 0)
      this.phase = 'stopped'
    }
  }

  getState() {
    const rotation = new THREE.Euler(
      this.angularVelocity.x,
      this.angularVelocity.y,
      this.angularVelocity.z
    )

    return {
      position: this.position.clone(),
      rotation,
      phase: this.phase,
      velocity: this.velocity.clone(),
      angularVelocity: this.angularVelocity.clone(),
      speed: this.velocity.length(),
      angularSpeed: this.angularVelocity.length(),
    }
  }

  reset() {
    this.position.copy(this.startPosition)
    this.velocity.set(0, 0, 0)
    this.angularVelocity.set(0, 0, 0)
    this.phase = 'idle'
    this.axisTilt = 0
    this.revRate = 0
  }
}

export default BallPhysics
