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
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ─── Colores webAI ────────────────────────────────────────────
    const CORP_COLORS = [
      0xf59e0b, 0x2ec4c4, 0x7c3aed, 0xfbbf24,
      0x06b6d4, 0xa78bfa, 0xf97316, 0x14b8a6,
      0x8b5cf6, 0xfcd34d, 0x67e8f9, 0x10b981,
      0xec4899, 0x6366f1, 0xf59e0b, 0x2ec4c4,
    ];

    // Patrón QR 5×5
    const qrPattern = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    // ─── Scene setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;background:transparent;';
    containerRef.current.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const pLight1 = new THREE.PointLight(0xf59e0b, 3, 50);
    pLight1.position.set(10, 10, 10);
    scene.add(pLight1);
    const pLight2 = new THREE.PointLight(0x2ec4c4, 2, 50);
    pLight2.position.set(-10, -5, 8);
    scene.add(pLight2);

    // ─── Objetos ──────────────────────────────────────────────────
    const cubeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const cubes: THREE.Mesh[] = [];
    const initialGroup = new THREE.Group();
    const qrGroup = new THREE.Group();
    let colorIdx = 0;
    let cubeIdx = 0;
    const totalCubes = qrPattern.flat().filter(Boolean).length;

    for (let r = 0; r < qrPattern.length; r++) {
      for (let c = 0; c < qrPattern[r].length; c++) {
        if (!qrPattern[r][c]) continue;

        const mat = new THREE.MeshStandardMaterial({
          color: CORP_COLORS[colorIdx % CORP_COLORS.length],
          metalness: 0.4,
          roughness: 0.4,
          emissive: CORP_COLORS[colorIdx % CORP_COLORS.length],
          emissiveIntensity: 0.15,
        });
        const cube = new THREE.Mesh(cubeGeo, mat);

        // Posición esférica inicial (Fibonacci sphere)
        const phi = Math.PI * (3 - Math.sqrt(5));
        const yN = 1 - (cubeIdx / (totalCubes - 1)) * 2;
        const rad = Math.sqrt(1 - yN * yN);
        const theta = phi * cubeIdx;
        const initPos = new THREE.Vector3(
          Math.cos(theta) * rad * 2.2,
          yN * 2.2,
          Math.sin(theta) * rad * 2.2
        );
        cube.position.copy(initPos);
        cube.lookAt(0, 0, 0);

        cube.userData['initPos'] = initPos.clone();
        cube.userData['qrPos'] = { x: (c - 2) * 1.2, y: (r - 2) * -1.2, z: 0 };

        cubes.push(cube);
        initialGroup.add(cube);
        colorIdx++;
        cubeIdx++;
      }
    }

    scene.add(initialGroup);
    scene.add(qrGroup);
    qrGroup.visible = false;

    // ─── Render loop via GSAP ticker ──────────────────────────────
    let idleSpinning = false;
    let currentGroup: THREE.Group = initialGroup;

    const tick = () => {
      if (idleSpinning && currentGroup) {
        currentGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    gsap.ticker.add(tick);
    gsap.ticker.fps(60);

    // ─── Resize ───────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ─── Animación GSAP ───────────────────────────────────────────
    const tl = gsap.timeline({
      onComplete: () => {
        idleSpinning = true;
        setShowButton(true);
      },
    });

    // FASE 1: Rotación de la esfera (0 → 2s)
    tl.to(initialGroup.rotation, {
      y: Math.PI * 1.5,
      x: -Math.PI,
      duration: 2.0,
      ease: 'power1.inOut',
    }, 0);

    // FASE 2: Zoom out (1.8 → 3.3s)
    tl.to(camera.position, {
      z: 12,
      duration: 1.5,
      ease: 'power2.inOut',
    }, 1.8);

    // Detach cubos de initialGroup → scene (a t=2.0)
    tl.call(() => {
      cubes.forEach(cube => scene.attach(cube));
      initialGroup.visible = false;
    }, [], 2.0);

    // Explosión
    cubes.forEach(cube => {
      tl.to(cube.position, {
        x: (Math.random() - 0.5) * 15,
        y: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 15,
        duration: 1.5,
        ease: 'power3.out',
      }, 2.1);
      tl.to(cube.rotation, {
        x: Math.random() * Math.PI * 4,
        y: Math.random() * Math.PI * 4,
        duration: 1.5,
        ease: 'power3.out',
      }, 2.1);
    });

    // FASE 3: Reorganización en QR (t=3.8)
    tl.call(() => {
      qrGroup.visible = true;
      currentGroup = qrGroup;
      cubes.forEach(cube => qrGroup.attach(cube));
    }, [], 3.8);

    tl.to(camera.position, {
      z: 8,
      duration: 2.0,
      ease: 'power3.inOut',
    }, 3.8);

    cubes.forEach((cube, i) => {
      tl.to(cube.position, {
        ...cube.userData['qrPos'],
        duration: 2.0,
        ease: 'elastic.out(1, 0.6)',
      }, 4.0 + i * 0.02);
      tl.to(cube.rotation, {
        x: 0, y: 0, z: 0,
        duration: 1.5,
        ease: 'power3.inOut',
      }, 4.2 + i * 0.02);
    });

    // FASE 4: Giro final del QR (t=6.2)
    tl.to(qrGroup.rotation, {
      y: -Math.PI / 16, z: Math.PI / 32,
      duration: 1.5,
      ease: 'power1.inOut',
    }, 6.2);
    tl.to(qrGroup.rotation, {
      x: 0, y: 0, z: 0,
      duration: 1.0,
      ease: 'power2.out',
    }, 7.7);

    // ─── Cleanup ──────────────────────────────────────────────────
    const cleanup = () => {
      tl.kill();
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      cubes.forEach(cube => {
        cube.geometry.dispose();
        (cube.material as THREE.Material).dispose();
      });
      cubeGeo.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem('introShown', 'true');
    const wrapper = document.querySelector('.intro-animation-wrapper') as HTMLElement | null;
    if (wrapper) {
      gsap.to(wrapper, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          cleanupRef.current?.();
          onComplete();
        },
      });
    } else {
      cleanupRef.current?.();
      onComplete();
    }
  };

  return (
    <div className="intro-animation-wrapper">
      <div ref={containerRef} className="intro-animation-container" onClick={handleEnter} />

      {showButton ? (
        <button className="intro-start-button" onClick={handleEnter}>
          ENTRAR
          <span className="intro-subtitle">web AI</span>
        </button>
      ) : (
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
