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
  
  // Fill base color
  ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
  ctx.fillRect(0, 0, width, height);

  // Get image data for pixel manipulation
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Perlin-like noise using sine waves for grain effect
  // Multiple octaves create natural looking wood
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Normalize coordinates
    const nx = x / width;
    const ny = y / height;

    // Multiple sine waves for grain pattern
    // Primarily horizontal (along the lane direction)
    const grain1 = Math.sin(ny * Math.PI * 8 * grainScale) * 0.5 + 0.5;
    const grain2 = Math.sin(ny * Math.PI * 3 * grainScale + nx * Math.PI * 2) * 0.3 + 0.7;
    const grain3 = Math.sin(ny * Math.PI * 24 * grainScale + Math.random() * 0.1) * 0.2 + 0.8;

    // Combine grain patterns
    const grainValue = grain1 * grain2 * grain3;

    // Create variation between dark and light
    const variance = grainValue;

    // Interpolate between colors based on grain
    const r = Math.floor(baseColor.r + (darkColor.r - baseColor.r) * (1 - variance) * 0.6);
    const g = Math.floor(baseColor.g + (darkColor.g - baseColor.g) * (1 - variance) * 0.6);
    const b = Math.floor(baseColor.b + (darkColor.b - baseColor.b) * (1 - variance) * 0.6);

    // Apply to canvas
    data[i] = r;        // R
    data[i + 1] = g;    // G
    data[i + 2] = b;    // B
    data[i + 3] = 255;  // A
  }

  ctx.putImageData(imageData, 0, 0);

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  
  // Optimize: Only use necessary properties
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // Base tan color
  ctx.fillStyle = 'rgb(200, 169, 110)';
  ctx.fillRect(0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create subtle oil sheen pattern with slight variations
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Normalize
    const nx = x / width;
    const ny = y / height;

    // Subtle horizontal stripes (oil pattern lines)
    const stripes = Math.sin(ny * Math.PI * 4) * 0.15 + 1.0;

    // Very subtle variation
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // Darker base for dry zone
  ctx.fillStyle = 'rgb(184, 147, 110)';
  ctx.fillRect(0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create more pronounced roughness pattern
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Normalize
    const nx = x / width;
    const ny = y / height;

    // Multiple grain frequencies for roughness
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');

  // Start with neutral normal (0.5, 0.5, 1.0) = blue
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create subtle normal variations for wood grain effect
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Normalize
    const ny = y / height;

    // Subtle grain direction (primarily along Y)
    const grainBump = Math.sin(ny * Math.PI * 8) * 0.3;

    // X normal (red channel) - follows grain direction
    const nx = 128 + grainBump * 20;
    // Y normal (green channel) - minimal
    const ny_norm = 128 + Math.sin(ny * Math.PI * 16) * 10;
    // Z normal (blue channel) - mostly up
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
