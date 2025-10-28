import React, { Suspense, useEffect, useRef, useState } from 'react';
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

export default function ModelViewer({ url, style, allowZoom = true, background = 'var(--viewer-bg)', fitMargin = 4.0, modelId = null }) {
  const [loadedObj, setLoadedObj] = useState(null);
  const controlsRef = useRef();
  const { getState, setState } = useViewerState();
  const saved = modelId != null ? getState(modelId) : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background, ...style }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 2000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows={false}
      >
            <ambientLight intensity={3.0} />
        <Suspense fallback={null}>
          <GLTFModel url={url} onLoaded={(obj) => { setLoadedObj(obj); }} />
        </Suspense>
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
      </Canvas>
    </div>
  );
}

useGLTF.preload?.(typeof process !== 'undefined' ? (process.env.PUBLIC_URL + '/models/example.glb') : '/models/example.glb');
