import * as THREE from "three";

// ============================================================
// مسؤولية مشتركة: ثوابت المحاكاة المركزية (نسخة مدمجة)
// ============================================================

export const SETTLE_FRAME_DELAY = 45;
export const SUMMARY_FALLBACK_FRAME_DELAY = 120;

// دمجنا القيمة الأكثر استقراراً (0.005) مع تعريفات الأبعاد الجديدة
export const PIN_REST_EPSILON = 0.05;

export const BALL_MASS = 6.0;
export const BALL_RADIUS = 0.108;

// أبعاد المسار والمجاري (إضافات الزميلة)
export const LANE_SURFACE_Y = 0.03;
export const BALL_LANE_Y = BALL_RADIUS + LANE_SURFACE_Y;
export const BALL_START_POS = new THREE.Vector3(0, BALL_LANE_Y, 0);

export const LANE_PLAYABLE_HALF_WIDTH = 0.525;
export const GUTTER_CENTER_X = 0.68;
export const GUTTER_WIDTH = 0.2;
export const BALL_GUTTER_Y = BALL_RADIUS * 0.95;

export const PIN_VISUAL_HEIGHT = 0.38;
export const PIN_VISUAL_FLOOR_OFFSET = 0.055;
export const LANE_END_Z = 18.5;
export const PIN_FALL_SOUND_COOLDOWN_MS = 140;

// إبقاء الجاذبية ثابتة مركزية
export const GRAVITY = 9.81;

export const SOUND_PATHS = {
  rollingBall: "/sounds/freesound_community-bowling-ball-90863 (1).mp3",
  pinFall: "/sounds/emycutiepants-bowling-strike-339170.mp3",
};

export const DEFAULT_RENDER_SETTINGS = {
  bloom: true,
  bloomStrength: 0.38,
  bloomRadius: 0.38,
  bloomThreshold: 0.72,
  exposure: 1.08,
  shadows: true,
};

export function createRenderSettings() {
  return { ...DEFAULT_RENDER_SETTINGS };
}

export const PIN_END_DESIGN = {
  wall: {
    width: 8,
    height: 3.4,
    y: 1.65,
    z: 20.15,
    repeat: new THREE.Vector2(3.2, 1.35),
  },
  pit: {
    width: 1.82,
    depth: 1.76,
    centerZ: 18.08,
    frameZ: 18.88,
    frameY: 0.6,
    frameWidth: 2.04,
    frameHeight: 1.08,
    frameThickness: 0.09,
  },
  neon: {
    y: 2.42,
    z: 20.075,
    width: 2.7,
    height: 1.08,
    red: "#ff2d4d",
    cyan: "#22dfff",
  },
};

export const CAMERA_MODES = {
  PLAYER: "player",
  IMPACT: "impact",
};
