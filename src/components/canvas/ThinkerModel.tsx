"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════════════════════
  THINKER MODEL – Cinematic Silver Museum Reveal (UPDATED)

  CHANGES:
  • Material → pure polished silver (metalness 0.95 + ultra-low roughness)
  • Lighting → dramatic top-down key light (main directional now comes from high above)
  • Result: charismatic cinematic vibe — like a silver sculpture under a museum spotlight.
    Strong highlights, deep shadows, glowing reflections. Pure premium.

  Everything else (size, smooth rotation, camera dolly, fog, mouse parallax) stays perfect.
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

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const { camera, scene: threeScene } = useThree();
  const { scene: gltfScene } = useGLTF("/models/the_thinker-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

  /* Centre + scale + SILVER material */
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    gltfScene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 2.68 / maxDim;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleFactor);
    }

    const mats: THREE.Material[] = [];
    gltfScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        mat.transparent = true;
        mat.depthWrite = true;

        if (mat instanceof THREE.MeshStandardMaterial) {
          // ── SILVER MATERIAL ───────────────────────
          mat.metalness = 0.95;          // high reflectivity
          mat.roughness = 0.14;          // polished mirror-like
          mat.envMapIntensity = 1.45;    // rich reflections
          mat.color.set("#e8e8e8");      // neutral silver base (won't override textures)
        }
        mats.push(mat);
      });
    });
    materialRefs.current = mats;

    threeScene.fog = new THREE.FogExp2(0x0a0a0a, 0.22);
  }, [gltfScene, threeScene]);

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

    const reveal = THREE.MathUtils.smoothstep(p, 0, 0.75);
    const rotReveal = THREE.MathUtils.smoothstep(p, 0, 0.82);

    // ── MODEL ───────────────────────────────────────────────────
    // Top-down cinematic parallax drop
    const baseY = THREE.MathUtils.lerp(2.5, 0, reveal);
    const floatY = Math.sin(t * 0.65) * 0.028 * (p * 0.7 + 0.3);
    groupRef.current.position.y = baseY + floatY;

    // ── ROTATION LOGIC (Separated & Incremental) ───────────────
    
    // 1. Reveal Swing: Purely scroll-locked (-8° -> 0°)
    const entrySwingY = THREE.MathUtils.lerp(-0.15, 0, rotReveal);

    // 2. Normal Idle Rotation: Accumulated by frame delta
    idleRotationRef.current += delta * 1.2 * rotReveal; 

    // 3. Mouse Parallax
    const parallaxRotY = mouseState.x * 0.15 * rotReveal;
    const parallaxRotX = mouseState.y * -0.08 * rotReveal;

    // Combine them additively
    groupRef.current.rotation.set(
      parallaxRotX, 
      entrySwingY + idleRotationRef.current + parallaxRotY, 
      0
    );

    // Constant scale for parallax effect (no more zoom in)
    const scaleVal = 0.93;
    if (!groupRef.current.userData.normalizedScale) {
      groupRef.current.userData.normalizedScale = groupRef.current.scale.x;
    }
    groupRef.current.scale.setScalar(
      groupRef.current.userData.normalizedScale * scaleVal
    );

    const opacity = THREE.MathUtils.clamp(reveal * 1.2, 0, 1);
    materialRefs.current.forEach((m) => { m.opacity = opacity; });

    // ── CAMERA ──────────────────────────────────────────────────
    const camZ = THREE.MathUtils.lerp(11.2, 5.05, p);
    const camX = mouseState.x * 1.35 + Math.sin(t * 0.045) * 0.22;
    const camY = 0.75 + mouseState.y * 0.95 + Math.cos(t * 0.052) * 0.11;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0.12, 0);

    // ── LIGHTING + FOG (top-down key light) ─────────────────────
    if (ambientRef.current) ambientRef.current.intensity = THREE.MathUtils.lerp(0.06, 0.85, p);
    if (dirLightRef.current) dirLightRef.current.intensity = THREE.MathUtils.lerp(0.15, 4.2, p); // Very strong top-down spotlight
    if (rimLightRef.current) rimLightRef.current.intensity = THREE.MathUtils.lerp(0.03, 1.5, p);
    if (pointLightRef.current) pointLightRef.current.intensity = THREE.MathUtils.lerp(0.04, 2.0, p);

    if (threeScene.fog && threeScene.fog instanceof THREE.FogExp2) {
      threeScene.fog.density = THREE.MathUtils.lerp(0.22, 0.006, p);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltfScene} />

      {/* Dramatic top-down key light (the charismatic spotlight) */}
      <ambientLight ref={ambientRef} color="#ffffff" intensity={0.06} />
      <directionalLight
        ref={dirLightRef}
        position={[0, 20, 2]}   // High above, slightly forward
        intensity={0.15}
        color="#e6f2ff"         // Icy white
      />
      <directionalLight
        ref={rimLightRef}
        position={[-8, 5, -8]}  // Back left
        intensity={0.03}
        color="#8aa7ff"         // Deep cool blue
      />
      <pointLight
        ref={pointLightRef}
        position={[2, -3, 3]}   // Bottom right, shining up
        intensity={0.04}
        color="#ff98a2"         // Signature pink glow
        distance={20}
      />

      <Environment preset="studio" environmentIntensity={0.95} />
    </group>
  );
}

// ─── Public Component ───────────────────────────────────────────
export function ThinkerModel() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    // scrollState.progress = 0; // Commented out to prevent disappearances during hot-reloads

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
        overflow: "visible",
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

useGLTF.preload("/models/the_thinker-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");