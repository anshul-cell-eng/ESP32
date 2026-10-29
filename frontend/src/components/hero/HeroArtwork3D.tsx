import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GasStatus } from '../../types/sentinel';
import { HeroArtworkFallback } from './HeroArtworkFallback';

interface HeroArtwork3DProps {
  status: GasStatus;
  reducedMotion?: boolean;
}

export const HeroArtwork3D: React.FC<HeroArtwork3DProps> = ({ status, reducedMotion = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const waveGroupRef = useRef<THREE.Group | null>(null);
  const ringMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const reqIdRef = useRef<number>(0);
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refined Industrial Palette for 3D Materials
  const statusPalette = {
    SAFE: {
      accent: 0x45d9e6,      // Cyan accent #45D9E6
      secondary: 0x32c98a,   // Safe green #32C98A
      emissive: 0x183638,
      rim: 0x45d9e6,
      lightIntensity: 2.2,
      particleColor: 0x45d9e6,
      ringSpeed: 0.0025,
      ringIntensity: 0.1,
    },
    WARNING: {
      accent: 0xf3b64b,      // Warning amber #F3B64B
      secondary: 0xf3b64b,
      emissive: 0x242e20,
      rim: 0xf3b64b,
      lightIntensity: 2.8,
      particleColor: 0xf3b64b,
      ringSpeed: 0.0055,
      ringIntensity: 0.3,
    },
    CRITICAL: {
      accent: 0xff6868,      // Critical red #FF6868
      secondary: 0xff6868,
      emissive: 0x2e1818,
      rim: 0xff6868,
      lightIntensity: 3.8,
      particleColor: 0xff6868,
      ringSpeed: 0.011,
      ringIntensity: 0.6,
    },
  }[status];

  // Update 3D materials dynamically when gas status changes
  useEffect(() => {
    if (!coreMeshRef.current || !lightRef.current || !rimLightRef.current) return;
    const conf = statusPalette;

    // 1. Core Diode Material & Point Light
    const coreMat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
    coreMat.color.setHex(conf.accent);
    coreMat.emissive.setHex(conf.accent);
    coreMat.emissiveIntensity = status === 'CRITICAL' ? 2.5 : status === 'WARNING' ? 1.8 : 1.2;

    lightRef.current.color.setHex(conf.accent);
    lightRef.current.intensity = conf.lightIntensity;

    rimLightRef.current.color.setHex(conf.rim);

    // 2. Wave Ribbons
    if (waveGroupRef.current) {
      waveGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const m = child.material as THREE.MeshStandardMaterial;
          m.color.setHex(conf.accent);
          m.emissive.setHex(conf.accent);
          m.emissiveIntensity = status === 'CRITICAL' ? 0.9 : 0.35;
        }
      });
    }

    // 3. Orbital Back Ring
    if (ringMeshRef.current) {
      const ringMat = ringMeshRef.current.material as THREE.MeshStandardMaterial;
      ringMat.emissive.setHex(conf.accent);
      ringMat.emissiveIntensity = status === 'CRITICAL' ? 0.6 : 0.2;
    }
  }, [status, statusPalette]);

  // Main Three.js Scene Setup
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

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting Setup (Sophisticated Industrial Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0x263b3c, 1.8);
    scene.add(ambientLight);

    // Key Directional Light (Crisp Off-Axis)
    const keyLight = new THREE.DirectionalLight(0xf5f5f0, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    // Atmospheric Teal Fill Light
    const fillLight = new THREE.DirectionalLight(0x3a5553, 1.5);
    fillLight.position.set(-5, -3, 3);
    scene.add(fillLight);

    // Status Dynamic Rim Light (Bottom-Right Glint)
    const rimLight = new THREE.DirectionalLight(statusPalette.rim, 1.8);
    rimLight.position.set(0, -5, -2);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Central Glowing Point Light
    const pointLight = new THREE.PointLight(statusPalette.accent, statusPalette.lightIntensity, 7);
    pointLight.position.set(0, 0, 0.8);
    scene.add(pointLight);
    lightRef.current = pointLight;

    // 4. Root Assembly Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Helper: Hexagonal Extruded Shape
    const createHexShape = (radius: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    };

    // A. Outer Beveled Casing (Elevated Teal Metal)
    const outerHexShape = createHexShape(2.3);
    const outerExtrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.14,
    };
    const outerGeo = new THREE.ExtrudeGeometry(outerHexShape, outerExtrudeSettings);
    outerGeo.center();

    // Refined Elevated Teal Metallic Material
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x204345,
      metalness: 0.82,
      roughness: 0.25,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    rootGroup.add(outerMesh);

    // B. Recessed Shield Face (Primary Teal Card Material, Visible Depth)
    const innerHexShape = createHexShape(2.05);
    const innerExtrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.06,
      bevelThickness: 0.08,
    };
    const innerGeo = new THREE.ExtrudeGeometry(innerHexShape, innerExtrudeSettings);
    innerGeo.center();

    // Translucent Refined Deep-Teal Shield
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x183638,
      metalness: 0.35,
      roughness: 0.2,
      transmission: 0.35,
      thickness: 1.2,
      transparent: true,
      opacity: 0.94,
      reflectivity: 0.85,
    });
    const glassMesh = new THREE.Mesh(innerGeo, glassMat);
    glassMesh.position.z = 0.12;
    rootGroup.add(glassMesh);

    // C. Chamfer Accent Bevel Ring
    const rimGeo = new THREE.RingGeometry(1.98, 2.05, 6);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x35d7e8,
      emissive: 0x0c4b54,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.z = 0.22;
    rootGroup.add(rimMesh);

    // D. 3D Embossed Gas-Flow Streamline Ribbons
    const waveGroup = new THREE.Group();
    waveGroupRef.current = waveGroup;

    const createWaveRibbon = (yOffset: number, amp: number, freq: number, zOffset: number) => {
      const points: THREE.Vector3[] = [];
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * 2 - 1; // -1 to 1
        const x = t * 1.45;
        const y = yOffset + Math.sin(t * Math.PI * freq) * amp * (1 - Math.abs(t) * 0.3);
        const z = zOffset + Math.cos(t * Math.PI) * 0.05;
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.038, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: statusPalette.accent,
        emissive: statusPalette.accent,
        emissiveIntensity: 0.35,
        metalness: 0.7,
        roughness: 0.2,
      });
      return new THREE.Mesh(tubeGeo, tubeMat);
    };

    waveGroup.add(createWaveRibbon(0.45, 0.18, 1.2, 0.25));
    waveGroup.add(createWaveRibbon(0.0, 0.22, 1.4, 0.28));
    waveGroup.add(createWaveRibbon(-0.45, 0.18, 1.2, 0.25));
    rootGroup.add(waveGroup);

    // E. Central Machined Optical Diode Sensor
    const coreCylinderGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.18, 24);
    coreCylinderGeo.rotateX(Math.PI / 2);
    const coreHousingMat = new THREE.MeshStandardMaterial({
      color: 0x071b1f,
      metalness: 0.95,
      roughness: 0.2,
    });
    const coreHousing = new THREE.Mesh(coreCylinderGeo, coreHousingMat);
    coreHousing.position.z = 0.28;
    rootGroup.add(coreHousing);

    // Central Glowing Lens
    const lensGeo = new THREE.SphereGeometry(0.18, 24, 16);
    const lensMat = new THREE.MeshStandardMaterial({
      color: statusPalette.accent,
      emissive: statusPalette.accent,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.1,
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.z = 0.38;
    rootGroup.add(lensMesh);
    coreMeshRef.current = lensMesh;

    // F. Orbital Mechanical Scanning Ring
    const orbitalRingGeo = new THREE.RingGeometry(2.55, 2.58, 64);
    const orbitalRingMat = new THREE.MeshStandardMaterial({
      color: 0x35d7e8,
      emissive: statusPalette.accent,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const orbitalRing = new THREE.Mesh(orbitalRingGeo, orbitalRingMat);
    orbitalRing.position.z = -0.3;
    rootGroup.add(orbitalRing);
    ringMeshRef.current = orbitalRing;

    // G. Subtle Atmospheric Particle Depth Field
    const particleCount = 55;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: statusPalette.particleColor,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // Mouse Tracking Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTargetRef.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 5. Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Smooth Mouse Parallax Lerp
      mouseCurrentRef.current.x += (mouseTargetRef.current.x - mouseCurrentRef.current.x) * 0.045;
      mouseCurrentRef.current.y += (mouseTargetRef.current.y - mouseCurrentRef.current.y) * 0.045;

      if (rootGroupRef.current) {
        // Subtle organic breathing drift + cursor tilt
        rootGroupRef.current.rotation.y = mouseCurrentRef.current.x * 0.35 + Math.sin(elapsedTime * 0.6) * 0.05;
        rootGroupRef.current.rotation.x = -mouseCurrentRef.current.y * 0.28 + Math.cos(elapsedTime * 0.5) * 0.04;
        rootGroupRef.current.position.y = Math.sin(elapsedTime * 0.8) * 0.06;
      }

      // Orbital Ring Continuous Slow Mechanical Rotation
      if (ringMeshRef.current) {
        ringMeshRef.current.rotation.z += statusPalette.ringSpeed;
      }

      // Slow Particle Field Drift
      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsedTime * 0.02;
      }

      // Optical Pulse
      if (coreMeshRef.current) {
        const pulse = Math.sin(elapsedTime * 2.4) * 0.15 + 1.0;
        coreMeshRef.current.scale.set(pulse, pulse, pulse);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      outerGeo.dispose();
      innerGeo.dispose();
      coreCylinderGeo.dispose();
      lensGeo.dispose();
      orbitalRingGeo.dispose();
      particleGeo.dispose();
    };
  }, [reducedMotion]);

  if (!webGlSupported || reducedMotion) {
    return <HeroArtworkFallback status={status} className="w-full h-full min-h-[380px]" />;
  }

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[540px] flex items-center justify-center select-none">
      {/* Editorial Atmospheric Backlight */}
      <div 
        className="absolute w-[360px] h-[360px] rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 -z-10"
        style={{
          background: status === 'CRITICAL' 
            ? 'radial-gradient(circle, rgba(255, 116, 109, 0.35) 0%, transparent 70%)'
            : status === 'WARNING'
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(53, 215, 232, 0.28) 0%, rgba(6, 46, 50, 0.4) 50%, transparent 80%)'
        }}
      />
      <div ref={mountRef} className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing" />
    </div>
  );
};
