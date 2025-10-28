import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import nbt from 'prismarine-nbt';
import { Buffer } from 'buffer';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// -------- Helpers (adapted from the provided Node script, browser-safe) --------
function isTypedArray(v) {
  return v && ArrayBuffer.isView(v) && !(v instanceof DataView);
}

// Ensure Buffer exists in browser (CRA v5 removes Node polyfills)
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// Handles arrays, typed arrays, OR objects like { "0": 1, "1": 2, ... }
function numericObjectToArray(maybeObj) {
  if (!maybeObj) return [];
  if (Array.isArray(maybeObj)) return maybeObj.slice();
  if (isTypedArray(maybeObj)) return Array.from(maybeObj);

  if (typeof maybeObj === 'object') {
    const keys = Object.keys(maybeObj)
      .map(k => Number(k))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);
    return keys.map(k => maybeObj[String(k)]);
  }

  return [maybeObj];
}

function humanizePaletteEntry(entry, collapseByNameOnly = true) {
  const name = entry?.name || entry?.block || entry?.id || 'unknown';
  if (collapseByNameOnly || !entry?.states || !Object.keys(entry.states).length) {
    return name;
  }
  const parts = Object.entries(entry.states).map(([k, v]) => `${k}=${v}`);
  return `${name}{${parts.join(',')}}`;
}

function getRoot(obj) { return obj; }

function getPalette(root) {
  return (
    root?.structure?.palette?.default?.block_palette ||
    root?.structure?.palette?.block_palette ||
    root?.palette ||
    root?.block_palette ||
    null
  );
}

function getSize(root) {
  const s = root?.structure?.size || root?.size || null;
  const arr = numericObjectToArray(s).map(Number).filter(Number.isFinite);
  if (arr.length >= 3) return { x: arr[0], y: arr[1], z: arr[2] };
  return null;
}

function getBlockIndicesLayers(root) {
  const bi =
    root?.structure?.block_indices ??
    root?.block_indices ??
    root?.structure?.indices ??
    null;
  if (!bi) return [];
  const layers = Array.isArray(bi) ? bi : [bi];
  return layers.map(layer => numericObjectToArray(layer));
}

// Combine multiple layers by choosing the first non-negative palette index
function combineLayersToSingleIndexArray(layers) {
  if (!layers.length) return [];
  const N = Math.max(...layers.map(l => l.length));
  const out = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    for (let l = 0; l < layers.length; l++) {
      const v = layers[l][i];
      if (typeof v === 'number' && v >= 0) { out[i] = v; break; }
    }
  }
  return out;
}

// Convert a linear index into x,y,z. Assumption: X is fastest, then Z, then Y (X->Z->Y)
function indexToPosition(i, size) {
  const sx = size.x | 0, sy = size.y | 0, sz = size.z | 0;
  const strideXZ = sx * sz;
  const y = Math.floor(i / strideXZ);
  const rem = i % strideXZ;
  const z = Math.floor(rem / sx);
  const x = rem % sx;
  return { x, y, z };
}

function collectBlocksByName(indices, palette, size, { skipAirLike = true, collapseByNameOnly = true } = {}) {
  const map = new Map();
  const isAirLike = (name) =>
    name === 'minecraft:air' ||
    name === 'minecraft:cave_air' ||
    name === 'minecraft:void_air' ||
    name === 'minecraft:structure_void';

  const N = indices.length;
  for (let i = 0; i < N; i++) {
    const pi = indices[i];
    if (pi < 0 || pi >= palette.length) continue;
    const entry = palette[pi] || {};
    const name = entry?.name || entry?.block || entry?.id || 'unknown';
    if (skipAirLike && isAirLike(name)) continue;

    const key = humanizePaletteEntry(entry, collapseByNameOnly);
    const pos = indexToPosition(i, size);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(pos);
  }
  return map; // Map<blockName, Array<{x,y,z}>>
}

function stripNamespace(name) {
  if (!name) return 'unknown';
  return String(name).includes(':') ? String(name).split(':')[1] : String(name);
}

function textureUrlForBlock(name) {
  const n = stripNamespace(name);
  // Most Bedrock textures use snake_case names matching block ids
  return `https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/textures/blocks/${n}.png`;
}

function colorForName(name) {
  // Stable pseudo-random color by hashing name
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  const r = (h & 0xff), g = (h >>> 8) & 0xff, b = (h >>> 16) & 0xff;
  return new THREE.Color(r/255, g/255, b/255);
}

// -------- Three.js components --------
function BlockInstancedMesh({ blockName, positions, center }) {
  const meshRef = useRef();
  const [material, setMaterial] = useState(null);

  useEffect(() => {
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const url = textureUrlForBlock(blockName);
    loader.load(url, (tex) => {
      if (disposed) return;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestMipMapNearestFilter;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshStandardMaterial({ map: tex });
      setMaterial(mat);
    }, undefined, () => {
      if (disposed) return;
      const mat = new THREE.MeshStandardMaterial({ color: colorForName(blockName) });
      setMaterial(mat);
    });
    return () => { disposed = true; };
  }, [blockName]);

  useEffect(() => {
    if (!meshRef.current) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const x = p.x - center.x + 0.5;
      const y = p.y - center.y + 0.5;
      const z = p.z - center.z + 0.5;
      m.makeTranslation(x, y, z);
      meshRef.current.setMatrixAt(i, m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, center]);

  // Avoid creating geometry per instance
  const geometry = useMemo(() => new THREE.BoxGeometry(1,1,1), []);

  return (
    <instancedMesh ref={meshRef} args={[geometry, material || new THREE.MeshStandardMaterial({ color: '#888' }), positions.length]}>
    </instancedMesh>
  );
}

const VoxelScene = React.forwardRef(function VoxelScene({ blocksByName, size }, ref) {
  const center = useMemo(() => ({ x: (size?.x || 0)/2, y: (size?.y || 0)/2, z: (size?.z || 0)/2 }), [size]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <group ref={ref}>
        {Array.from(blocksByName.entries()).map(([name, positions]) => (
          <BlockInstancedMesh key={name} blockName={name} positions={positions} center={center} />
        ))}
      </group>
      <gridHelper args={[Math.max(size?.x || 10, size?.z || 10) + 2, Math.max(size?.x || 10, size?.z || 10) + 2]} position={[0, -0.01, 0]} />
      <Environment preset="city" />
    </>
  );
});

// -------- Main Page Component --------
export default function NbtViewer() {
  const [blocksByName, setBlocksByName] = useState(null);
  const [size, setSize] = useState(null);
  const [info, setInfo] = useState({ paletteCount: 0, voxelCount: 0 });
  const [error, setError] = useState(null);
  const voxGroupRef = useRef();

  const onFile = useCallback(async (file) => {
    setError(null);
    setBlocksByName(null);
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const nodeBuf = Buffer.from(ab); // prismarine-nbt expects Buffer
      const parsed = await new Promise((resolve, reject) => {
        // Bedrock .mcstructure is uncompressed little-endian; prismarine-nbt auto-detects Endianness
        nbt.parse(nodeBuf, (err, data) => err ? reject(err) : resolve(data));
      });
      const simplified = nbt.simplify(parsed);
      const root = getRoot(simplified);
      const palette = root?.structure?.palette?.default?.block_palette || [];
      const sizeArr = root?.size;
      const sizeObj = Array.isArray(sizeArr) && sizeArr.length >= 3 ? { x: sizeArr[0], y: sizeArr[1], z: sizeArr[2] } : null;
      const layers = root?.structure?.block_indices || [];
      if (!palette || !layers.length || !sizeObj) {
        throw new Error('Could not find palette, block_indices, or size in structure file.');
      }
      // Ensure plain arrays
      const normLayers = Array.isArray(layers) ? layers.map(l => Array.isArray(l) ? l : Array.from(l || [])) : [];
      const indices = combineLayersToSingleIndexArray(normLayers);
      const blocks = collectBlocksByName(indices, palette, sizeObj, { skipAirLike: true, collapseByNameOnly: true });
      setBlocksByName(blocks);
      setSize(sizeObj);
      setInfo({ paletteCount: palette.length || 0, voxelCount: indices.length });
    } catch (e) {
      console.error(e);
      setError(String(e?.message || e));
    }
  }, []);

  const onExportGlb = useCallback(() => {
    if (!voxGroupRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      voxGroupRef.current,
      (gltf) => {
        const blob = new Blob([gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf)], { type: 'model/gltf-binary' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'structure.glb';
        document.body.appendChild(a);
        a.click();
        a.remove();
      },
      (err) => {
        console.error('GLB export error', err);
      },
      { binary: true }
    );
  }, []);

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <h1>Bedrock .mcstructure viewer (test)</h1>
      <p>Upload a .mcstructure file; it will parse NBT in the browser and render a voxel mesh below using Three.js. Textures are fetched from Mojang's bedrock-samples repo. Missing textures fall back to flat colors.</p>

      <label className="btn" style={{ display: 'inline-block', cursor: 'pointer' }}>
        <input type="file" accept=".mcstructure" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
        Choose .mcstructure
      </label>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {blocksByName && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 14, opacity: 0.8 }}>
            <span>Palette entries: {info.paletteCount}</span>
            <span style={{ marginLeft: 12 }}>Voxels: {info.voxelCount}</span>
            {size && <span style={{ marginLeft: 12 }}>Size: {size.x} x {size.y} x {size.z}</span>}
            <button className="btn small" style={{ marginLeft: 12 }} onClick={onExportGlb}>Export GLB</button>
          </div>
          <div style={{ height: 600, borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
            <Canvas camera={{ position: [8, 8, 8], fov: 50 }} shadows>
              <OrbitControls makeDefault />
              <VoxelScene ref={voxGroupRef} blocksByName={blocksByName} size={size} />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  );
}
