// Remove missing source map reference from @mediapipe/tasks-vision to silence source-map-loader warnings
// Safe no-op if the file or reference doesn’t exist.
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs');

try {
  if (!fs.existsSync(file)) {
    process.exit(0);
  }
  const original = fs.readFileSync(file, 'utf8');
  const updated = original.replace(/\n\s*\/\/\#\s*sourceMappingURL=vision_bundle_mjs\.js\.map\s*$/m, '\n');
  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('[postinstall] Removed missing source map reference from @mediapipe/tasks-vision');
  }
} catch (err) {
  console.warn('[postinstall] Could not adjust @mediapipe/tasks-vision source map reference:', err && err.message ? err.message : err);
}
