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

  BUG FIXES:
  ① useGLTF caches the GLB globally. Directly mutating gltfScene.position
    corrupts the cache — on every remount (hot reload, nav) the bounding box
    is computed on an already-offset scene, causing the exploded/shattered look.
    Fix: clone the scene with useMemo before touching it.

  ② scrollState.progress is a module-level singleton that is never reset on
    remount, so the camera can spawn at a wrong z on re-entry.
    Fix: reset to 0 inside the ThinkerModel useEffect on mount.

  ③ Removed the userData.normalizedScale pattern inside useFrame — it was
    set every single frame via a guard, which is fragile. The base scale is
    now computed once in the setup effect and stored in a ref.
  ═══════════════════════════════════════════════════════════════
*/

// ─── Shared state ───────────────────────────────────────────────
const scrollState = { progress: 0 };
const mouseState = { x: 0, y: 0 };

// ─── Inner 3D Scene ─────────────────────────────────────────────
function ThinkerScene() {
  const groupRef = useRef<THREE.Group>(null);
  const idleRotationRef = useRef(0);
  const materialRefs = useRef<THREE.Material[]>([]);
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

  /*
    ── FIX ①: Clone the cached scene before mutating it ──────────
    useGLTF returns the same object reference every time (module-level cache).
    Calling gltfScene.position.set(...) on the raw reference permanently shifts
    the cached root, so the next mount computes a wrong bounding box and the
    geometry explodes. Cloning gives us a fresh, independent object.
  */
  const clonedScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  /* Centre + scale + SILVER material */
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
    baseScaleRef.current = scaleFactor; // ── FIX ③: store once, read in useFrame

    const mats: THREE.Material[] = [];
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat) => {
        mat.transparent = true;
        mat.depthWrite = true;

        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.metalness = 0.95;
          mat.roughness = 0.14;
          mat.envMapIntensity = 1.45;
          mat.color.set("#e8e8e8");
        }
        mats.push(mat);
      });
    });
    materialRefs.current = mats;

    threeScene.fog = new THREE.FogExp2(0x0a0a0a, 0.22);
  }, [clonedScene, threeScene]);

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

    // ── SCALE (FIX ③: use pre-computed base, never re-derive) ────
    groupRef.current.scale.setScalar(baseScaleRef.current);

    const opacity = THREE.MathUtils.clamp(reveal * 1.2, 0, 1);
    materialRefs.current.forEach((m) => { m.opacity = opacity; });

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

      <Environment preset="studio" environmentIntensity={0.95} />
    </group>
  );
}

// ─── Public Component ────────────────────────────────────────────
export function ThinkerModel() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tweenRef   = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    /*
      FIX ②: Always reset progress to 0 on mount.
      scrollState is a module singleton — if the component unmounts while
      scrolled (hot reload, page navigation) and then remounts, progress
      stays at its last value and the camera spawns at the wrong position.
    */
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
        overflow: "hidden", // changed from "visible" — prevents viewport calc bugs
      }}
    >
      <Canvas
        camera={{ position: [0, 0.8, 11.2], fov: 37, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
        style={{ background: "transparent" }}
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