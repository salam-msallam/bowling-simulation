// ملف تجربة بسيط — main.ts أو test.ts
import * as THREE from "three";
import BallPhysics from "./BallPhysics";
import OilZone from "./OilZone ";
// 1️⃣ نعمل كرةimport * as THREE from "three";

const ball = new BallPhysics(7, 0.108, new THREE.Vector3(0, 0, 0));
const oil = OilZone.fromPreset("Medium");

ball.launch(8, 0.05, 3);

// نطبع كل frame عشان نشوف وين بالضبط بيتغير الـ phase
// في أول الـ loop بـ main.ts
for (let t = 0; t < 5; t += 0.016) {
  const state = ball.getState();
  const mu = oil.getMu(state.position.z);
  ball.update(0.016, mu);

  if (Math.abs(t % 0.5) < 0.016) {
    const omega = Math.abs(ball["angularVelocity"].x);
    const v = ball["velocity"].z;
    const rollingSpeed = omega * 0.108;
    console.log(
      `t=${t.toFixed(1)}s | z=${state.position.z.toFixed(2)} | phase=${state.phase} | v=${v.toFixed(3)} | ωR=${rollingSpeed.toFixed(3)} | mu=${mu.toFixed(4)}`,
    );
  }
}
const presets = ["Short", "Medium", "Long"] as const;

for (const preset of presets) {
  const ball = new BallPhysics(7, 0.108, new THREE.Vector3(0, 0, 0));
  const oil = OilZone.fromPreset(preset);
  ball.launch(8, 0.05, 3);

  let transitionTime = -1;
  let transitionZ = -1;

  for (let t = 0; t < 6; t += 0.016) {
    const state = ball.getState();
    const mu = oil.getMu(state.position.z);
    ball.update(0.016, mu);

    if (state.phase === "sliding" && ball["phase"] === "pure_rolling") {
      transitionTime = t;
      transitionZ = state.position.z;
    }
  }

  console.log(
    `${preset}: pure_rolling عند t=${transitionTime.toFixed(1)}s | z=${transitionZ.toFixed(2)}m`,
  );
}
