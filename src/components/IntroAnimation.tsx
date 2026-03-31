'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import './IntroAnimation.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);
  const animationRef = useRef<{ cleanup: () => void } | null>(null);

  useEffect(() => {
    // ─── Colores de webAI: naranja + teal + púrpura + variantes oscuras
    const CORP_COLORS = [
      0xf59e0b, // Naranja principal
      0x2ec4c4, // Teal principal
      0x7c3aed, // Púrpura
      0xfbbf24, // Naranja claro
      0x06b6d4, // Cyan
      0xa78bfa, // Lavanda
      0xf97316, // Naranja intenso
      0x14b8a6, // Teal oscuro
      0x8b5cf6, // Violeta
      0xfcd34d, // Amarillo cálido
      0x67e8f9, // Cyan claro
      0x10b981, // Verde esmeralda
      0xec4899, // Rosa
      0x6366f1, // Índigo
      0xf59e0b, // Naranja (repite para llenar el patrón)
      0x2ec4c4, // Teal (repite)
    ];

    // Patrón QR 5x5 (igual que el original)
    const qrPattern = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    const cubes: THREE.Mesh[] = [];
    const initialGroup = new THREE.Group();
    const qrGroup = new THREE.Group();
    let currentObject: THREE.Group | null = null;
    let animationRunning = false;
    let animationId: number | null = null;

    function initThree() {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
      }

      camera.position.z = 8;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0xf59e0b, 2.0);
      pointLight1.position.set(10, 10, 10);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x2ec4c4, 1.5);
      pointLight2.position.set(-10, -5, 8);
      scene.add(pointLight2);
    }

    function createObjects() {
      const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      let colorIndex = 0;
      let cubeIndex = 0;
      const totalCubes = qrPattern.flat().filter(Boolean).length;

      for (let r = 0; r < qrPattern.length; r++) {
        for (let c = 0; c < qrPattern[r].length; c++) {
          if (qrPattern[r][c] === 1) {
            const material = new THREE.MeshStandardMaterial({
              color: CORP_COLORS[colorIndex % CORP_COLORS.length],
              metalness: 0.4,
              roughness: 0.5,
              emissive: CORP_COLORS[colorIndex % CORP_COLORS.length],
              emissiveIntensity: 0.12,
            });
            const cube = new THREE.Mesh(cubeGeometry, material);

            // Posición esférica inicial
            const phi = Math.PI * (3 - Math.sqrt(5));
            const y = 1 - (cubeIndex / (totalCubes - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * cubeIndex;
            const initialPos = new THREE.Vector3(
              Math.cos(theta) * radius * 2,
              y * 2,
              Math.sin(theta) * radius * 2
            );
            cube.position.copy(initialPos);
            cube.lookAt(0, 0, 0);

            cube.userData['initialPosition'] = initialPos.clone();
            cube.userData['initialRotation'] = cube.rotation.clone();

            // Posición final QR grid
            cube.userData['qrPosition'] = new THREE.Vector3(
              (c - 2) * 1.2,
              (r - 2) * -1.2,
              0
            );

            cubes.push(cube);
            initialGroup.add(cube);
            colorIndex++;
            cubeIndex++;
          }
        }
      }

      scene.add(initialGroup);
      scene.add(qrGroup);
      qrGroup.visible = false;
      currentObject = initialGroup;
    }

    function startTransition() {
      if (animationRunning) return;
      animationRunning = true;

      const tl = gsap.timeline({
        onComplete: () => {
          animationRunning = false;
          setShowButton(true);
        },
      });

      // FASE 1: Rotación suave de la esfera
      tl.to(initialGroup.rotation, {
        y: Math.PI * 1.5,
        x: -Math.PI,
        duration: 2.0,
        ease: 'power1.inOut',
      }, 0);

      // FASE 2: Zoom out + explosión
      tl.to(camera.position, {
        z: 12,
        duration: 1.5,
        ease: 'power2.inOut',
      }, 1.8);

      tl.add(() => {
        cubes.forEach((cube) => scene.attach(cube));
        initialGroup.visible = false;
      }, 2.0);

      cubes.forEach((cube) => {
        const dir = {
          x: (Math.random() - 0.5) * 15,
          y: (Math.random() - 0.5) * 15,
          z: (Math.random() - 0.5) * 15,
        };
        tl.to(cube.position, { ...dir, duration: 1.5, ease: 'power3.out' }, 2.1);
        tl.to(cube.rotation, {
          x: Math.random() * Math.PI * 4,
          y: Math.random() * Math.PI * 4,
          duration: 1.5,
          ease: 'power3.out',
        }, 2.1);
      });

      // FASE 3: Reorganización en QR
      tl.add(() => {
        qrGroup.visible = true;
        currentObject = qrGroup;
        cubes.forEach((cube) => qrGroup.attach(cube));
      }, 3.8);

      tl.to(camera.position, { z: 8, duration: 2.0, ease: 'power3.inOut' }, 3.8);

      cubes.forEach((cube, index) => {
        tl.to(cube.position, {
          ...cube.userData['qrPosition'],
          duration: 2.0,
          ease: 'elastic.out(1, 0.6)',
        }, 4.0 + index * 0.02);
        tl.to(cube.rotation, {
          x: 0, y: 0, z: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        }, 4.2 + index * 0.02);
      });

      // FASE 4: Movimiento final del QR
      tl.to(qrGroup.rotation, {
        y: -Math.PI / 16,
        z: Math.PI / 32,
        duration: 1.5,
        ease: 'power1.inOut',
      }, 6.2);

      tl.to(qrGroup.rotation, {
        x: 0, y: 0, z: 0,
        duration: 1.0,
        ease: 'power2.out',
      }, 7.7);
    }

    function animate() {
      animationId = requestAnimationFrame(animate);
      if (!animationRunning && currentObject) {
        currentObject.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    }

    function handleResize() {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }

    function cleanup() {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      cubes.forEach((cube) => {
        cube.geometry?.dispose();
        (cube.material as THREE.Material)?.dispose();
      });
      if (renderer) {
        renderer.dispose();
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      if (scene) {
        while (scene.children.length > 0) scene.remove(scene.children[0]);
      }
    }

    initThree();
    createObjects();
    animate();
    startTransition();
    window.addEventListener('resize', handleResize);

    animationRef.current = { cleanup };
    return cleanup;
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem('introShown', 'true');
    const wrapper = document.querySelector('.intro-animation-wrapper') as HTMLElement | null;
    if (wrapper) {
      gsap.to(wrapper, {
        opacity: 0,
        duration: 0.6,
        onComplete: () => {
          animationRef.current?.cleanup();
          onComplete();
        },
      });
    } else {
      animationRef.current?.cleanup();
      onComplete();
    }
  };

  return (
    <div className="intro-animation-wrapper">
      <div ref={containerRef} className="intro-animation-container" onClick={handleEnter} />

      {showButton && (
        <button className="intro-start-button" onClick={handleEnter}>
          ENTRAR
          <span className="intro-subtitle">web AI</span>
        </button>
      )}

      {!showButton && (
        <button className="intro-skip-button" onClick={handleEnter}>
          Saltar ⏭
        </button>
      )}

      <div className="intro-brand">
        <div className="intro-brand-name">WEB AI</div>
        <div className="intro-brand-tagline">Website Builder</div>
      </div>
    </div>
  );
};

export default IntroAnimation;
