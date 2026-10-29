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
      accent: 0x32c98a,     // Clean industrial safe green #32C98A
      rimAccent: 0x45d9e6,  // Restrained cyan highlights #45D9E6
      ambient: 0x183638,
      lightIntensity: 1.4,
      ringSpeed: 0.003,
      ringColor: 0x45d9e6,
      ringIntensity: 0.1,
    },
    WARNING: {
      accent: 0xf3b64b,     // Clean industrial amber #F3B64B
      rimAccent: 0xf3b64b,
      ambient: 0x242e20,
      lightIntensity: 1.8,
      ringSpeed: 0.006,
      ringColor: 0xf3b64b,
      ringIntensity: 0.3,
    },
    CRITICAL: {
      accent: 0xff6868,     // Clean industrial red #FF6868
      rimAccent: 0xff6868,
      ambient: 0x2e1818,
      lightIntensity: 2.4,
      ringSpeed: 0.012,
      ringColor: 0xff6868,
      ringIntensity: 0.6,
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
          m.emissive.setHex(conf.rimAccent);
          m.emissiveIntensity = status === 'CRITICAL' ? 0.4 : status === 'WARNING' ? 0.25 : 0.1;
        }
      });
    }

    // Update rear indicator ring (Subtle in SAFE, Amber in WARNING, Red in CRITICAL)
    if (backRingRef.current) {
      const ringMat = backRingRef.current.material as THREE.MeshStandardMaterial;
      ringMat.color.setHex(conf.ringColor);
      ringMat.emissive.setHex(conf.ringColor);
      ringMat.emissiveIntensity = conf.ringIntensity;
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
    const keyLight = new THREE.DirectionalLight(0xf5f5f0, 2.0);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3a5553, 1.2);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x45d9e6, 1.5);
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

    // 3. Precision Beveled Hexagonal Chassis (Refined Deep-Teal Elevated Metal)
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

    // Outer Casing Geometry with visible beveled rim
    const outerExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };
    const casingGeo = new THREE.ExtrudeGeometry(shape, outerExtrudeSettings);
    casingGeo.center();

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x204345, // Elevated teal, visible against #183638 card
      metalness: 0.78,
      roughness: 0.25,
    });
    const casingMesh = new THREE.Mesh(casingGeo, casingMat);
    masterGroup.add(casingMesh);
    bevelRimRef.current = casingMesh;

    // 4. Recessed Inner Face (Coordinated Secondary Surface with depth)
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
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    innerGeo.center();
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x263b3c, // Secondary teal surface, visible depth (not pitch black)
      metalness: 0.45,
      roughness: 0.35,
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
        roughness: 0.25,
        emissive: statusConfig.rimAccent,
        emissiveIntensity: 0.15,
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
    const ledBaseMat = new THREE.MeshStandardMaterial({ color: 0x3a5553, metalness: 0.85, roughness: 0.25 });
    const ledBase = new THREE.Mesh(ledBaseGeo, ledBaseMat);
    ledBase.rotation.x = Math.PI / 2;
    ledBase.position.z = 0.22;
    masterGroup.add(ledBase);

    const ledLensGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const ledLensMat = new THREE.MeshStandardMaterial({
      color: statusConfig.accent,
      emissive: statusConfig.accent,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    const ledLens = new THREE.Mesh(ledLensGeo, ledLensMat);
    ledLens.position.z = 0.26;
    masterGroup.add(ledLens);
    indicatorLedRef.current = ledLens;

    // 7. Scanning Indicator Ring (Subtle cyan in SAFE, Amber in WARNING, Red in CRITICAL)
    const ringGeo = new THREE.TorusGeometry(2.1, 0.025, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: statusConfig.ringColor,
      metalness: 0.8,
      roughness: 0.35,
      emissive: statusConfig.ringColor,
      emissiveIntensity: statusConfig.ringIntensity,
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
