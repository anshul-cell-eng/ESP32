import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GasStatus } from '../../types/sentinel';
import { FallbackEmblem } from './FallbackEmblem';

interface ThreeSafetyEmblemProps {
  status: GasStatus;
  reducedMotion?: boolean;
}

export const ThreeSafetyEmblem: React.FC<ThreeSafetyEmblemProps> = ({ status, reducedMotion = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const indicatorLedRef = useRef<THREE.Mesh | null>(null);
  const statusLightRef = useRef<THREE.PointLight | null>(null);
  const bevelRimRef = useRef<THREE.Mesh | null>(null);
  const backRingRef = useRef<THREE.Mesh | null>(null);
  const wavePipesRef = useRef<THREE.Group | null>(null);
  const reqIdRef = useRef<number>(0);

  // Status color tokens (Industrial, professional, non-neon)
  const statusConfig = {
    SAFE: {
      accent: 0x16a34a,     // Clean industrial green
      rimAccent: 0x3b82f6,  // Subtle slate blue
      ambient: 0x0f172a,
      lightIntensity: 1.2,
      ringSpeed: 0.003,
    },
    WARNING: {
      accent: 0xd97706,     // Clean industrial amber
      rimAccent: 0xf59e0b,
      ambient: 0x1f1406,
      lightIntensity: 1.8,
      ringSpeed: 0.006,
    },
    CRITICAL: {
      accent: 0xdc2626,     // Clean industrial red
      rimAccent: 0xef4444,
      ambient: 0x220b0e,
      lightIntensity: 2.4,
      ringSpeed: 0.012,
    },
  }[status];

  // Update materials when status changes
  useEffect(() => {
    if (!indicatorLedRef.current || !statusLightRef.current) return;

    const conf = statusConfig;

    // Update LED status light
    const ledMat = indicatorLedRef.current.material as THREE.MeshStandardMaterial;
    ledMat.color.setHex(conf.accent);
    ledMat.emissive.setHex(conf.accent);
    ledMat.emissiveIntensity = status === 'CRITICAL' ? 1.4 : 0.8;

    statusLightRef.current.color.setHex(conf.accent);
    statusLightRef.current.intensity = conf.lightIntensity;

    // Update wave relief accent
    if (wavePipesRef.current) {
      wavePipesRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const m = child.material as THREE.MeshStandardMaterial;
          m.color.setHex(conf.rimAccent);
          m.emissive.setHex(conf.accent);
          m.emissiveIntensity = status === 'CRITICAL' ? 0.3 : 0.05;
        }
      });
    }

    // Update rear indicator ring
    if (backRingRef.current) {
      const ringMat = backRingRef.current.material as THREE.MeshStandardMaterial;
      ringMat.emissive.setHex(conf.accent);
      ringMat.emissiveIntensity = status === 'CRITICAL' ? 0.4 : 0.1;
    }
  }, [status, statusConfig]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || reducedMotion) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 2. Industrial Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.6);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x64748b, 0.8);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.2);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);

    const statusLight = new THREE.PointLight(statusConfig.accent, statusConfig.lightIntensity, 6);
    statusLight.position.set(0, 0, 0.8);
    scene.add(statusLight);
    statusLightRef.current = statusLight;

    // Master Group for smooth pitch/yaw
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);
    groupRef.current = masterGroup;

    // 3. Precision Beveled Hexagonal Chassis (Titanium/Dark Steel)
    const hexRadius = 1.65;
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = hexRadius * Math.cos(angle);
      const y = hexRadius * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    // Outer Casing Geometry with substantial depth
    const outerExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };
    const casingGeo = new THREE.ExtrudeGeometry(shape, outerExtrudeSettings);
    casingGeo.center();

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.28,
    });
    const casingMesh = new THREE.Mesh(casingGeo, casingMat);
    masterGroup.add(casingMesh);
    bevelRimRef.current = casingMesh;

    // 4. Recessed Inner Face (Dark Matte Industrial Inset)
    const innerRadius = 1.45;
    const innerShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = innerRadius * Math.cos(angle);
      const y = innerRadius * Math.sin(angle);
      if (i === 0) innerShape.moveTo(x, y);
      else innerShape.lineTo(x, y);
    }
    innerShape.closePath();

    const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    innerGeo.center();
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.6,
      roughness: 0.45,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.z = 0.16;
    masterGroup.add(innerMesh);

    // 5. Embossed 3D Gas-Wave Sensor Ridges (Solid geometric tubes)
    const wavesGroup = new THREE.Group();
    const createReliefWave = (yOffset: number, curveAmp: number) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.85, yOffset, 0),
        new THREE.Vector3(0, yOffset + curveAmp, 0.08),
        new THREE.Vector3(0.85, yOffset, 0)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.038, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: statusConfig.rimAccent,
        metalness: 0.75,
        roughness: 0.3,
      });
      return new THREE.Mesh(tubeGeo, tubeMat);
    };

    wavesGroup.add(createReliefWave(0.32, 0.2));
    wavesGroup.add(createReliefWave(0.0, 0.24));
    wavesGroup.add(createReliefWave(-0.32, 0.2));
    wavesGroup.position.z = 0.22;
    masterGroup.add(wavesGroup);
    wavePipesRef.current = wavesGroup;

    // 6. Machined Central Indicator LED
    const ledBaseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.06, 24);
    const ledBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const ledBase = new THREE.Mesh(ledBaseGeo, ledBaseMat);
    ledBase.rotation.x = Math.PI / 2;
    ledBase.position.z = 0.22;
    masterGroup.add(ledBase);

    const ledLensGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const ledLensMat = new THREE.MeshStandardMaterial({
      color: statusConfig.accent,
      emissive: statusConfig.accent,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const ledLens = new THREE.Mesh(ledLensGeo, ledLensMat);
    ledLens.position.z = 0.26;
    masterGroup.add(ledLens);
    indicatorLedRef.current = ledLens;

    // 7. Subtle Rear Mechanical Indicator Ring (Calm, understated)
    const ringGeo = new THREE.TorusGeometry(2.1, 0.025, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.4,
      emissive: statusConfig.accent,
      emissiveIntensity: 0.1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.z = -0.15;
    masterGroup.add(ringMesh);
    backRingRef.current = ringMesh;

    // 8. Subtle Parallax (Restrained mouse interaction)
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetY = x * 0.25;
      targetX = -y * 0.25;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // 9. Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle, restrained float & lerped tilt
      if (masterGroup) {
        masterGroup.rotation.x += (targetX - masterGroup.rotation.x) * 0.05;
        masterGroup.rotation.y += (targetY - masterGroup.rotation.y) * 0.05;
        masterGroup.position.y = Math.sin(elapsed * 1.2) * 0.03;
      }

      // Smooth rear mechanical ring rotation
      if (backRingRef.current) {
        backRingRef.current.rotation.z += statusConfig.ringSpeed;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      casingGeo.dispose();
      casingMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ledBaseGeo.dispose();
      ledBaseMat.dispose();
      ledLensGeo.dispose();
      ledLensMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion]);

  if (!webGlSupported || reducedMotion) {
    return <FallbackEmblem status={status} />;
  }

  return (
    <div className="relative w-full h-[220px] md:h-[240px] flex items-center justify-center select-none">
      <div ref={mountRef} className="w-full h-full cursor-default" />
    </div>
  );
};
