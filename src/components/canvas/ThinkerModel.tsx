"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════════════════════
  THINKER MODEL – Cinematic Silver Museum Reveal

  PERFORMANCE OPTIMIZATIONS APPLIED:
  ① Shared Material: Single instance of MeshPhysicalMaterial replaces 
     per-mesh materials. Saves memory and reduces shader compilation.
  ② Renderer Tuning: dpr capped at 1.5, stencil buffer disabled,
     powerPreference set to high-performance.
  ③ Environment Baking: frames={1} resolution={128} prevents per-frame
     reflection rendering overhead.
  ④ Proper Disposal: Material is disposed on unmount to prevent VRAM leaks.
  ═══════════════════════════════════════════════════════════════
*/

// ─── Shared state ───────────────────────────────────────────────
const scrollState = { progress: 0 };
const mouseState = { x: 0, y: 0 };

// ─── Inner 3D Scene ─────────────────────────────────────────────
function ThinkerScene() {
  const groupRef = useRef<THREE.Group>(null);
  const idleRotationRef = useRef(0);
  // Store the computed base scale so useFrame never re-derives it
  const baseScaleRef = useRef<number>(1);

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const { camera, scene: threeScene } = useThree();
  const { scene: gltfScene } = useGLTF(
    "/models/the_thinker_clean.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  const clonedScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  // Create ONE shared material for the entire Thinker to save memory and draw calls
  // Upgraded to MeshPhysicalMaterial for premium clearcoat silver aesthetics
  const sharedMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#e8e8e8",
    metalness: 0.95,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.45,
    transparent: true,
    depthWrite: true,
    opacity: 0,
  }), []);

  // Ensure material is cleaned up from GPU memory when unmounted
  useEffect(() => {
    return () => sharedMaterial.dispose();
  }, [sharedMaterial]);

  /* Centre + scale + assign shared material */
  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Safe to mutate — this is our private clone
    clonedScene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (2.68 / maxDim) * 0.93; // bake the 0.93 in from day one

    groupRef.current.scale.setScalar(scaleFactor);
    baseScaleRef.current = scaleFactor;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = sharedMaterial;
      }
    });

    threeScene.fog = new THREE.FogExp2(0x0a0a0a, 0.22);
  }, [clonedScene, threeScene, sharedMaterial]);

  /* Mouse parallax */
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseState.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseState.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  /* Scroll-driven animation */
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const p = scrollState.progress;

    const reveal    = THREE.MathUtils.smoothstep(p, 0, 0.75);
    const rotReveal = THREE.MathUtils.smoothstep(p, 0, 0.82);

    // ── MODEL ────────────────────────────────────────────────────
    const baseY  = THREE.MathUtils.lerp(2.5, 0, reveal);
    const floatY = Math.sin(t * 0.65) * 0.028 * (p * 0.7 + 0.3);
    groupRef.current.position.y = baseY + floatY;

    // ── ROTATION ─────────────────────────────────────────────────
    const entrySwingY = THREE.MathUtils.lerp(-0.15, 0, rotReveal);
    idleRotationRef.current += delta * 1.2 * rotReveal;
    const parallaxRotY = mouseState.x * 0.15 * rotReveal;
    const parallaxRotX = mouseState.y * -0.08 * rotReveal;

    groupRef.current.rotation.set(
      parallaxRotX,
      entrySwingY + idleRotationRef.current + parallaxRotY,
      0
    );

    // ── SCALE ────────────────────────────────────────────────────
    groupRef.current.scale.setScalar(baseScaleRef.current);

    // Update single shared material opacity
    const targetOpacity = THREE.MathUtils.clamp(reveal * 1.2, 0, 1);
    if (sharedMaterial.opacity !== targetOpacity) {
      sharedMaterial.opacity = targetOpacity;
    }

    // ── CAMERA ───────────────────────────────────────────────────
    const camZ = THREE.MathUtils.lerp(11.2, 5.05, p);
    const camX = mouseState.x * 1.35 + Math.sin(t * 0.045) * 0.22;
    const camY = 0.75 + mouseState.y * 0.95 + Math.cos(t * 0.052) * 0.11;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0.12, 0);

    // ── LIGHTING + FOG ───────────────────────────────────────────
    if (ambientRef.current)   ambientRef.current.intensity   = THREE.MathUtils.lerp(0.06, 0.85, p);
    if (dirLightRef.current)  dirLightRef.current.intensity  = THREE.MathUtils.lerp(0.15, 4.2,  p);
    if (rimLightRef.current)  rimLightRef.current.intensity  = THREE.MathUtils.lerp(0.03, 1.5,  p);
    if (pointLightRef.current) pointLightRef.current.intensity = THREE.MathUtils.lerp(0.04, 2.0, p);

    if (threeScene.fog instanceof THREE.FogExp2) {
      threeScene.fog.density = THREE.MathUtils.lerp(0.22, 0.006, p);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />

      <ambientLight ref={ambientRef} color="#ffffff" intensity={0.06} />
      <directionalLight
        ref={dirLightRef}
        position={[0, 20, 2]}
        intensity={0.15}
        color="#e6f2ff"
      />
      <directionalLight
        ref={rimLightRef}
        position={[-8, 5, -8]}
        intensity={0.03}
        color="#8aa7ff"
      />
      <pointLight
        ref={pointLightRef}
        position={[2, -3, 3]}
        intensity={0.04}
        color="#ff98a2"
        distance={20}
      />

      <Environment preset="studio" environmentIntensity={0.95} frames={1} resolution={128} />
    </group>
  );
}

// ─── Public Component ────────────────────────────────────────────
export function ThinkerModel() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tweenRef   = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    scrollState.progress = 0;

    tweenRef.current = gsap.to(scrollState, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: "top 85%",
        end: "top 20%",
        scrub: 1.35,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      tweenRef.current?.scrollTrigger?.kill();
      tweenRef.current?.kill();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "340px",
        overflow: "hidden", // prevents viewport calc bugs
      }}
    >
      <Canvas
        camera={{ position: [0, 0.8, 11.2], fov: 37, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
          stencil: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        }}
        style={{ background: "transparent" }}
        resize={{ debounce: { scroll: 50, resize: 0 } }}
      >
        <ThinkerScene />
      </Canvas>
    </div>
  );
}

useGLTF.preload(
  "/models/the_thinker_clean.glb",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);