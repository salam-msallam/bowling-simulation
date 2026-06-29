/**
 * ================================================================
 *  TEXTURE GENERATOR - Phase 1 Visual Enhancement
 *  
 *  Procedurally generates realistic textures for:
 *  - Wood lanes (oil & dry zones)
 *  - Procedural patterns for visual depth
 *  - Optimized for performance using canvas
 * ================================================================
 */

import * as THREE from 'three';

// ============================================================
// مسؤولية العضو 4: توليد الخامات برمجيًا
// هذا الملف يحول رسومات Canvas إلى THREE.CanvasTexture لاستخدامها على المسار.
// المستخدم حاليًا في createMaterials.js: generateWoodTexture و generateNormalMap.
// generateOilPatternTexture و generateDryZoneTexture دوال مساعدة قديمة وغير مربوطة حالياً بالتطبيق.
// ============================================================

/**
 * Generate a procedural wood grain texture using canvas
 * Simulates natural wood with directional grain
 * 
 * @param {number} width - Canvas width (default 512)
 * @param {number} height - Canvas height (default 128) - tall for directional grain
 * @param {Object} options - Configuration
 * @returns {THREE.CanvasTexture} Wood texture ready for material
 */
export function generateWoodTexture(width = 512, height = 128, options = {}) {
  // ينشئ خامة خشب إجرائية بالاعتماد على موجات بسيطة داخل Canvas.
  // ركز هنا إذا أردت تغيير لون الخشب أو اتجاه الحبيبات على المسار.
  const {
    baseColor = { r: 200, g: 169, b: 110 },      // Tan wood base
    darkColor = { r: 140, g: 100, b: 60 },       // Dark grain
    lightColor = { r: 220, g: 185, b: 130 },     // Light highlights
    grainScale = 2.0,                             // Grain size multiplier
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  
  // نملأ الخلفية باللون الأساسي للخشب قبل إضافة الحبيبات.
  ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
  ctx.fillRect(0, 0, width, height);

  // نقرأ بيانات البكسلات حتى نغير كل بكسل ونرسم شكل الحبيبات.
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // نستخدم عدة موجات sine كتقريب بسيط لحبيبات الخشب بدل استخدام مكتبة noise.
  // تعدد الترددات يعطي تفاصيل أكثر طبيعية.
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // نحول الإحداثيات إلى مجال 0..1 حتى تبقى النتيجة مستقرة مع أي حجم Canvas.
    const nx = x / width;
    const ny = y / height;

    // موجات متعددة باتجاه طول المسار لتقليد خطوط الخشب.
    const grain1 = Math.sin(ny * Math.PI * 8 * grainScale) * 0.5 + 0.5;
    const grain2 = Math.sin(ny * Math.PI * 3 * grainScale + nx * Math.PI * 2) * 0.3 + 0.7;
    const grain3 = Math.sin(ny * Math.PI * 24 * grainScale + Math.random() * 0.1) * 0.2 + 0.8;

    // دمج الموجات ينتج تبايناً بين المناطق الفاتحة والداكنة.
    const grainValue = grain1 * grain2 * grain3;

    // variance يحدد مقدار اقتراب البكسل من اللون الغامق أو الفاتح.
    const variance = grainValue;

    // نخلط بين اللون الأساسي واللون الغامق حسب قيمة الحبيبات.
    const r = Math.floor(baseColor.r + (darkColor.r - baseColor.r) * (1 - variance) * 0.6);
    const g = Math.floor(baseColor.g + (darkColor.g - baseColor.g) * (1 - variance) * 0.6);
    const b = Math.floor(baseColor.b + (darkColor.b - baseColor.b) * (1 - variance) * 0.6);

    // نكتب اللون الجديد داخل بيانات الصورة.
    data[i] = r;        // R
    data[i + 1] = g;    // G
    data[i + 2] = b;    // B
    data[i + 3] = 255;  // A
  }

  ctx.putImageData(imageData, 0, 0);

  // نحول Canvas إلى Texture يمكن وضعها على خامة Three.js.
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  
  // نخبر Three.js أن بيانات الخامة تغيرت وتحتاج رفعاً للـ GPU.
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generate oil zone pattern texture (glossy, slightly wet-looking)
 * Creates a subtle wet/shiny pattern for the first 12m of lane
 * 
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {THREE.CanvasTexture} Oil pattern texture
 */
export function generateOilPatternTexture(width = 256, height = 256) {
  // ينشئ خامة مساعدة قديمة لمنطقة الزيت: لون خشبي مع لمعان وخطوط خفيفة.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // لون أساس قريب من خشب المسار.
  ctx.fillStyle = 'rgb(200, 169, 110)';
  ctx.fillRect(0, 0, width, height);

  // نقرأ البكسلات لتعديلها وإضافة تأثير الزيت.
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // نمط زيت خفيف: خطوط أفقية وتباين بسيط حتى لا تبدو الخامة مسطحة.
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // إحداثيات طبيعية 0..1 لتسهيل حساب النمط.
    const nx = x / width;
    const ny = y / height;

    // خطوط زيت خفيفة باتجاه عرض الصورة.
    const stripes = Math.sin(ny * Math.PI * 4) * 0.15 + 1.0;

    // تباين بسيط يكسر التكرار المنتظم.
    const variation = Math.sin(nx * Math.PI * 2 + ny * Math.PI) * 0.05;

    const multiplier = stripes + variation;

    data[i] = Math.min(255, Math.floor(200 * multiplier));       // R
    data[i + 1] = Math.min(255, Math.floor(169 * multiplier));   // G
    data[i + 2] = Math.min(255, Math.floor(110 * multiplier));   // B
    data[i + 3] = 255;  // A
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generate dry zone texture (matte, rougher appearance)
 * More visible texture, less glossy
 * 
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {THREE.CanvasTexture} Dry zone texture
 */
export function generateDryZoneTexture(width = 256, height = 256) {
  // ينشئ خامة مساعدة قديمة للمنطقة الجافة: أغمق وأخشن بصرياً من منطقة الزيت.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // لون أساس أغمق لتمييز المنطقة الجافة.
  ctx.fillStyle = 'rgb(184, 147, 110)';
  ctx.fillRect(0, 0, width, height);

  // نقرأ البكسلات لإضافة خشونة وتفاصيل.
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // تفاصيل أكثر وضوحاً من منطقة الزيت حتى تبدو أقل لمعاناً.
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // إحداثيات طبيعية 0..1.
    const nx = x / width;
    const ny = y / height;

    // ترددات متعددة تعطي إحساس خشونة وتفاوت في السطح.
    const detail1 = Math.sin(ny * Math.PI * 6) * 0.3;
    const detail2 = Math.sin(nx * Math.PI * 8 + ny * Math.PI * 4) * 0.2;
    const detail3 = Math.sin(ny * Math.PI * 16) * 0.15;

    const totalVariation = detail1 + detail2 + detail3;
    const multiplier = 1.0 + totalVariation * 0.5;

    data[i] = Math.min(255, Math.floor(184 * multiplier));       // R
    data[i + 1] = Math.min(255, Math.floor(147 * multiplier));   // G
    data[i + 2] = Math.min(255, Math.floor(110 * multiplier));   // B
    data[i + 3] = 255;  // A
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generate normal map for enhanced surface detail
 * Adds apparent texture depth without additional geometry
 * 
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {THREE.CanvasTexture} Normal map texture
 */
export function generateNormalMap(width = 256, height = 256) {
  // ينشئ normal map بسيط يعطي إحساس عمق لحبيبات الخشب بدون زيادة geometry.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // نبدأ بلون normal محايد: أزرق يعني السطح باتجاه الأعلى.
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, width, height);

  // نقرأ البكسلات لتعديل اتجاه normal لكل بكسل.
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // نضيف تغيرات خفيفة تجعل الضوء يتفاعل مع الخشب وكأن فيه حبيبات.
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // نستخدم المحور Y لتوجيه الحبيبات بشكل طولي.
    const ny = y / height;

    // اهتزاز خفيف في normal لمحاكاة بروز الحبيبات.
    const grainBump = Math.sin(ny * Math.PI * 8) * 0.3;

    // قناة X في normal map.
    const nx = 128 + grainBump * 20;
    // قناة Y بتغير قليل حتى لا يصبح السطح مبالغاً فيه.
    const ny_norm = 128 + Math.sin(ny * Math.PI * 16) * 10;
    // قناة Z تبقى عالية لأن السطح شبه مستو.
    const nz = 255 - Math.abs(grainBump) * 30;

    data[i] = Math.max(0, Math.min(255, Math.floor(nx)));          // R
    data[i + 1] = Math.max(0, Math.min(255, Math.floor(ny_norm))); // G
    data[i + 2] = Math.max(0, Math.min(255, Math.floor(nz)));      // B
    data[i + 3] = 255;  // A
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;

  return texture;
}
