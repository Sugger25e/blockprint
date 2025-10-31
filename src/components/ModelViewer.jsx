import React, { Suspense, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useViewerState } from '../context/ViewerStateContext';

function FitCameraToObject({ object, margin = 1.2 }) {
  const { camera, controls, gl } = useThree();
  useEffect(() => {
    if (!object) return;
    const box = new THREE.Box3().setFromObject(object);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180; 
      let cameraZ = Math.abs((maxSize / 2) / Math.tan(fov / 2)) * margin;

      cameraZ = Math.max(cameraZ, 0.1);

      camera.position.set(center.x, center.y, center.z + cameraZ);
      camera.near = cameraZ / 100;
      camera.far = cameraZ * 1000;
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.copy(center);
        controls.update();
      }
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }, [object, camera, controls, gl, margin]);
  return null;
}

const ModelViewer = forwardRef(ModelViewerImpl);
export default ModelViewer;

useGLTF.preload?.(typeof process !== 'undefined' ? (process.env.PUBLIC_URL + '/models/example.glb') : '/models/example.glb');

function GLTFModel({ url, onLoaded }) {
  const { scene } = useGLTF(url, true);
  const group = useRef();

  useEffect(() => {
    if (scene) {
      onLoaded?.(scene);
    }
  }, [scene, onLoaded]);

  return <primitive ref={group} object={scene} dispose={null} />;
}

function GridPlatform({ object, size = 64, divisions = 64 }) {
  if (!object) return null;
  try {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const width = Math.max(size, Math.max(sizeVec.x, sizeVec.z) * 2);
    const minY = box.min.y;

    return (
      <group position={[center.x, 0, center.z]}>
        <gridHelper args={[Math.max(8, width), divisions, '#6b7280', '#374151']} position={[0, minY - 0.01, 0]} rotation={[0, 0, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, minY - 0.02, 0]}>
          <planeGeometry args={[width, width]} />
          <meshBasicMaterial color={'#000000'} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    );
  } catch (e) {
    return null;
  }
}

function CameraStateSync({ modelId, saved, setState, controlsRef, loaded }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!saved || !controlsRef.current || !loaded) return;
    const [cx, cy, cz] = saved.position || [];
    const [tx, ty, tz] = saved.target || [];
    if ([cx, cy, cz].every((n) => typeof n === 'number')) camera.position.set(cx, cy, cz);
    if ([tx, ty, tz].every((n) => typeof n === 'number')) controlsRef.current.target.set(tx, ty, tz);
    controlsRef.current.update();
    camera.updateProjectionMatrix();
  }, [saved, loaded, controlsRef, camera]);

  useEffect(() => {
    if (!controlsRef.current || modelId == null) return;
    const handler = () => {
      const pos = camera.position.toArray();
      const tgt = controlsRef.current.target.toArray();
      setState(modelId, { position: pos, target: tgt });
    };
    controlsRef.current.addEventListener('change', handler);
    controlsRef.current.addEventListener('end', handler);
    return () => {
      if (!controlsRef.current) return;
      controlsRef.current.removeEventListener('change', handler);
      controlsRef.current.removeEventListener('end', handler);
    };
  }, [controlsRef, camera, modelId, setState]);
  return null;
}

// ErrorBoundary component to catch GLTF loading/render errors
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ModelViewer error', error, info); }
  render() {
    if (this.state.hasError) {
      // If a fallback UI was provided (e.g. a preview image), render it.
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: 12, color: 'var(--muted)', textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>Failed to load model.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn" onClick={() => { this.setState({ hasError: false, error: null }); if (typeof this.props.onReset === 'function') this.props.onReset(); }}>Reload viewer</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ModelViewerImpl({ url, style, allowZoom = true, background = 'var(--viewer-bg)', fitMargin = 1.0, modelId = null, ambientIntensity = 4.5, fallbackImage = null, showGrid = false }, ref) {
  const [loadedObj, setLoadedObj] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  const controlsRef = useRef();
  const canvasElRef = useRef(null);
  const { getState, setState } = useViewerState();
  const saved = modelId != null ? getState(modelId) : null;

  useLoadTimeout(loadedObj, setLoadError, url);

  // Expose capture API to parent: returns a Blob (PNG) of the canvas
  useImperativeHandle(ref, () => ({
    async capture(options = {}) {
      const el = canvasElRef.current;
      if (!el) throw new Error('Canvas not ready');
      const quality = options.quality || 0.92;
      const scale = Math.max(1, Number(options.scale) || 1);
      // If no scaling requested, capture directly
      if (scale === 1) {
        const blob = await new Promise((resolve, reject) => {
          try {
            el.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/png', quality);
          } catch (e) { reject(e); }
        });
        return blob;
      }

      // For higher-resolution capture, draw the existing canvas onto a larger offscreen canvas
      const srcW = el.width || el.clientWidth;
      const srcH = el.height || el.clientHeight;
      const out = document.createElement('canvas');
      out.width = Math.floor(srcW * scale);
      out.height = Math.floor(srcH * scale);
      const ctx = out.getContext('2d');
      // ensure transparent background
      ctx.clearRect(0, 0, out.width, out.height);
      // draw scaled
      ctx.drawImage(el, 0, 0, out.width, out.height);
      const blob = await new Promise((resolve, reject) => {
        try {
          out.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/png', quality);
        } catch (e) { reject(e); }
      });
      return blob;
    }
  }), []);

  return (
  <div style={{ position: 'relative', width: '100%', height: '100%', background, boxSizing: 'border-box', ...style }}>
      <Canvas
        key={viewerKey}
        camera={{ fov: 45, near: 0.1, far: 2000 }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true, alpha: true }}
        shadows={false}
        onCreated={({ gl }) => { canvasElRef.current = gl.domElement; try { gl.setClearColor(0x000000, 0); } catch(_) {} }}
      >
        <ambientLight intensity={ambientIntensity} />
        <ErrorBoundary fallback={fallbackImage ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
            <img src={fallbackImage} alt="Model preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        ) : null} onReset={() => setViewerKey(k => k + 1)}>
          <Suspense fallback={<></>}>
            <GLTFModel url={url} onLoaded={(obj) => { setLoadedObj(obj); }} />
          </Suspense>
        </ErrorBoundary>
        {loadedObj && !saved && <FitCameraToObject object={loadedObj} margin={fitMargin} />}
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom={allowZoom}
          enableRotate
          autoRotate={false}
          makeDefault
        />
        <CameraStateSync modelId={modelId} saved={saved} setState={setState} controlsRef={controlsRef} loaded={!!loadedObj} />
        {/* 3D platform grid under the model when requested */}
        {showGrid && loadedObj && <GridPlatform object={loadedObj} />}
      </Canvas>
      {/* 2D overlay grid removed — using 3D GridPlatform only */}
      {/* Centered spinner while the GLTF hasn't finished loading */}
      {!loadedObj && !loadError && (
        <div className="viewer-spinner" role="status" aria-live="polite">
          <div className="spinner-ring" aria-hidden="true"></div>
          <span className="sr-only">Loading model preview</span>
        </div>
      )}
      {/* If loading appears to be stuck, show a friendly message or fallback image */}
      {loadError && (
        <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>
          {fallbackImage ? (
            <img src={fallbackImage} alt="Model preview" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>Model is taking too long to load.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn" onClick={() => setViewerKey(k => k + 1)}>Reload viewer</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Show load timeout: if the GLTF hasn't called onLoaded within 12s, mark as loadError
function useLoadTimeout(loadedObj, setLoadError, url) {
  useEffect(() => {
    setLoadError(false);
    if (!url) return;
    const t = setTimeout(() => {
      if (!loadedObj) setLoadError(true);
    }, 12000);
    return () => clearTimeout(t);
  }, [loadedObj, setLoadError, url]);
}
