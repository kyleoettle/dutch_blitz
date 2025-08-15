/**
 * Card SVG Generator
 * Generates vector (SVG) card faces (1-10) for colors: red, green, blue, yellow
 * plus a card back. Output goes to: src/assets/vectors/cards
 *
 * Aspect ratio matches existing card scale (width:height ≈ 2.4:3.3 -> 240x330 viewBox).
 *
 * Usage (from repo root):
 *   node scripts/generate-card-svgs.js
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'vectors', 'cards');

const COLORS = {
  red:   { base: '#d63a3a', dark: '#b02222', text: '#ffffff', stroke: '#7a1414' },
  green: { base: '#25a04b', dark: '#1e7a39', text: '#ffffff', stroke: '#145026' },
  blue:  { base: '#2d59d1', dark: '#1f3f94', text: '#ffffff', stroke: '#142a54' },
  yellow:{ base: '#e3c132', dark: '#b69719', text: '#ffffff', stroke: '#8a6808' }
};

const WIDTH = 240; // px
const HEIGHT = 330; // px

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cornerNumber(n, colorSpec) {
  // Bottom value raised (was HEIGHT-16) to avoid touching rounded border
  const bottomY = HEIGHT - 44; // 44px margin from bottom instead of 16
  return `<g font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="${colorSpec.text}" stroke="rgba(0,0,0,0.25)" stroke-width="2" paint-order="stroke" text-anchor="middle">\n    <text x="32" y="56">${n}</text>\n    <text x="${WIDTH-32}" y="${bottomY}" transform="rotate(180 ${WIDTH-32} ${bottomY})">${n}</text>\n  </g>`;
}

function centerNumber(n, colorSpec) {
  const offsetY = (HEIGHT / 2) - 12; // raise number up slightly
  return `<g font-family="Arial, sans-serif" font-size="170" font-weight="900" fill="${colorSpec.text}" stroke="rgba(0,0,0,0.45)" stroke-width="8" paint-order="stroke" text-anchor="middle" dominant-baseline="central">\n    <text x="${WIDTH/2}" y="${offsetY}">${n}</text>\n  </g>`;
}

function generateFace(colorName, value) {
  const spec = COLORS[colorName];
  // Keep unique gradient id even though filename no longer has _filled suffix
  const id = `${colorName}_${value}_filled`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">\n  <defs>\n    <linearGradient id="grad_${id}" x1="0" y1="0" x2="0" y2="1">\n      <stop offset="0%" stop-color="${spec.base}" />\n      <stop offset="100%" stop-color="${spec.dark}" />\n    </linearGradient>\n    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">\n      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.35)" />\n    </filter>\n  </defs>\n  <rect x="4" y="4" rx="24" ry="24" width="${WIDTH-8}" height="${HEIGHT-8}" fill="url(#grad_${id})" stroke="${spec.stroke}" stroke-width="8" filter="url(#shadow)" />\n  <rect x="4" y="4" rx="24" ry="24" width="${WIDTH-8}" height="${HEIGHT-8}" fill="rgba(255,255,255,0.06)" />\n  <circle cx="${WIDTH/2}" cy="${(HEIGHT/2)-8}" r="92" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="18" stroke-linecap="round" stroke-dasharray="24 18" />\n  ${cornerNumber(value, spec)}\n  ${centerNumber(value, spec)}\n</svg>`;
}

function generateBack() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" shape-rendering="geometricPrecision">\n  <defs>\n    <linearGradient id="back_grad" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0%" stop-color="#1e1e26" />\n      <stop offset="100%" stop-color="#303044" />\n    </linearGradient>\n    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">\n      <rect x="0" y="0" width="20" height="20" fill="none" stroke="#555" stroke-width="2" />\n    </pattern>\n    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">\n      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.35)" />\n    </filter>\n  </defs>\n  <rect x="4" y="4" rx="24" ry="24" width="${WIDTH-8}" height="${HEIGHT-8}" fill="url(#back_grad)" stroke="#888" stroke-width="10" filter="url(#shadow)" />\n  <rect x="24" y="24" rx="14" ry="14" width="${WIDTH-48}" height="${HEIGHT-48}" fill="url(#grid)" stroke="rgba(255,255,255,0.08)" stroke-width="4" />\n  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="800" fill="#e0e0e0" text-anchor="middle" dominant-baseline="central" letter-spacing="4">DB</text>\n</svg>`;
}

function main() {
  ensureDir(OUTPUT_DIR);
  // Faces
  Object.keys(COLORS).forEach(color => {
    for (let value = 1; value <= 10; value++) {
      const svg = generateFace(color, value);
      // Generate new-style filled card WITHOUT _filled suffix (user will delete legacy manually)
      const filename = path.join(OUTPUT_DIR, `card_${color}_${value}.svg`);
      fs.writeFileSync(filename, svg, 'utf8');
    }
  });
  // Back
  fs.writeFileSync(path.join(OUTPUT_DIR, 'card_back.svg'), generateBack(), 'utf8');
  const expected = Object.keys(COLORS).length * 10;
  const actual = fs.readdirSync(OUTPUT_DIR).filter(f => /^card_(red|green|blue|yellow)_([1-9]|10)\.svg$/.test(f)).length;
  if (actual !== expected) {
    console.warn(`WARNING: Expected ${expected} face SVGs, found ${actual}. Check generation loops.`);
  } else {
    console.log(`Generated ${actual} face SVGs + back in ${OUTPUT_DIR}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateFace, generateBack };
