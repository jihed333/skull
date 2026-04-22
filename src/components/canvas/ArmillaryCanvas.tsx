"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Environment, useTexture } from "@react-three/drei";

import * as THREE from "three";

/*
  ═══════════════════════════════════════════════════════════════
  ARMILLARY SPHERE — Premium Contact Section Hero

  Visual stack (order matters):
    1. Custom baked texture  (/image.png)
    2. MeshPhysicalMaterial  (crystal transmission + chrome)
    3. Strong HDR reflections (studio env, intensity 1.8)
    4. NoToneMapping          (preserve saturated pink)
    5. Bloom pass             (cinematic glow)

  Motion: Slow continuous rotation + mouse parallax
  Loading: Lazy via Intersection Observer
  ═══════════════════════════════════════════════════════════════
*/

// ─── Shared mouse state (avoids re-renders) ────────────────────
const mouseState = { x: 0, y: 0 };

// ─── Material detection helpers ────────────────────────────────
function isGemMaterial(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  const name = mat.name.toLowerCase();
  if (
    name.includes("gem") ||
    name.includes("amethyst") ||
    name.includes("crystal") ||
    name.includes("stone") ||
    name.includes("lambert8")
  )
    return true;
  const hsl = { h: 0, s: 0, l: 0 };
  mat.color.getHSL(hsl);
  // Purple/violet range
  return hsl.h > 0.6 && hsl.h < 0.9 && hsl.s > 0.2;
}

function isMetalFrame(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  const name = mat.name.toLowerCase();
  if (
    name.includes("gold") ||
    name.includes("metal") ||
    name.includes("frame") ||
    name.includes("ring") ||
    name.includes("band") ||
    name.includes("rings") ||
    name.includes("body") ||
    name.includes("platform")
  )
    return true;
  return mat.metalness > 0.5;
}

// ─── Inner 3D Scene ────────────────────────────────────────────
function ArmillaryScene() {
  const groupRef = useRef<THREE.Group>(null);
  const smoothMouse = useRef({ x: 0, y: 0 });

  const { camera, scene: threeScene } = useThree();
  const { scene: gltfScene, animations } = useGLTF(
    "/models/armillary_amethyst_optimized.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  // Load the custom baked texture
  const customTexture = useTexture("/257e1452-aae1-430c-9639-7f2e351caa1c.webp");

  // Play embedded animations if they exist
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach((action) => {
        if (action) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.timeScale = 0.4;
          action.play();
        }
      });
    }
  }, [actions]);

  /* Centre + scale + material transformation */
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    gltfScene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 2.2 / maxDim;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleFactor);
    }

    // ── Prepare custom texture ──────────────────────────────────
    customTexture.flipY = false;
    customTexture.colorSpace = THREE.SRGBColorSpace;
    customTexture.needsUpdate = true;

    /* ── MATERIAL TRANSFORMATION ── */
    gltfScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat, idx) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;

        if (isGemMaterial(mat)) {
          // ── CRYSTAL PINK MATERIAL ───────────────────────────────
          // Crystals are light amplifiers, not colored plastic.
          // Transmission=1, high IOR, near-zero roughness = cinema gem.
          const gemMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color("#ff98a2"),

            transmission: 0.85,
            thickness: 2.5,
            ior: 2.0,

            roughness: 0.05,
            metalness: 0,

            clearcoat: 1,
            clearcoatRoughness: 0.05,

            envMapIntensity: 2.5,

            transparent: true,
            opacity: 1,
          });

          if (Array.isArray(child.material)) {
            child.material[idx] = gemMat;
          } else {
            child.material = gemMat;
          }
        } else if (isMetalFrame(mat)) {
          // ── BRUSHED CHROME / SILVER ─────────────────────────────
          // Silver appears only with strong contrast reflections.
          // Apply baked texture for surface detail, boost metalness.
          mat.map = customTexture;
          mat.color.set("#ffffff");
          mat.metalness = 0.95;
          mat.roughness = 0.15;
          mat.envMapIntensity = 1.5;
          mat.transparent = false;
          mat.depthWrite = true;
          // Reset gold specular baked into GLB
          (mat as THREE.MeshPhysicalMaterial).specularIntensity = 1;
          mat.needsUpdate = true;
        } else {
          // ── FALLBACK: chrome ────────────────────────────────────
          mat.map = customTexture;
          mat.color.set("#ffffff");
          mat.metalness = 0.88;
          mat.roughness = 0.2;
          mat.envMapIntensity = 1.2;
          mat.transparent = false;
          mat.depthWrite = true;
          (mat as THREE.MeshPhysicalMaterial).specularIntensity = 1;
          mat.needsUpdate = true;
        }
      });
    });

    // Subtle depth fog
    threeScene.fog = new THREE.FogExp2(0x080810, 0.07);
  }, [gltfScene, threeScene, customTexture]);

  /* Mouse tracking */
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseState.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseState.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  /* Per-frame animation */
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Smooth mouse interpolation (for camera sway only)
    smoothMouse.current.x = THREE.MathUtils.damp(smoothMouse.current.x, mouseState.x, 3, delta);
    smoothMouse.current.y = THREE.MathUtils.damp(smoothMouse.current.y, mouseState.y, 3, delta);

    // Subtle floating drift
    const floatY = Math.sin(t * 0.4) * 0.04;
    groupRef.current.position.y = floatY;
    groupRef.current.position.x = 0;

    // Gentle continuous rotation on Y axis (horizontal)
    groupRef.current.rotation.y += delta * 0.18;

    // Camera gentle sway
    camera.position.x = Math.sin(t * 0.08) * 0.1 + smoothMouse.current.x * 0.2;
    camera.position.y = 0.2 + Math.cos(t * 0.06) * 0.08 + smoothMouse.current.y * 0.1;
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltfScene} />

      {/* ── Cinematic Lighting Rig ── */}

      {/* Deep ambient — just enough to reveal shadow detail */}
      <ambientLight color="#10101a" intensity={0.2} />

      {/* Key light — cool white top-right */}
      <directionalLight position={[3, 8, 4]} intensity={3.0} color="#f0f4ff" />

      {/* Strong rim light — creates chrome contrast (CRITICAL for silver) */}
      <directionalLight position={[-6, 3, -6]} intensity={2.5} color="#ffffff" />

      {/* Pink rim — echoes gem color */}
      <directionalLight position={[-5, 2, -6]} intensity={1.0} color="#ff98a2" />

      {/* Uplight fill — subtle bounce */}
      <pointLight position={[0, -2, 3]} intensity={0.5} color="#ffe0ea" distance={20} />

      {/* Accent — warm highlight to break flatness */}
      <pointLight position={[4, -1, -2]} intensity={0.4} color="#ffd4e0" distance={15} />

      {/* HDR environment — studio at high intensity for chrome reflections */}
      <Environment preset="studio" environmentIntensity={1.8} />


    </group>
  );
}

// ─── Public Component with Lazy Loading ─────────────────────────
export default function ArmillaryCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      setIsVisible(entry.isIntersecting);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "600px 0px", // Wake up much earlier
      threshold: 0,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[0] transition-opacity duration-700"
      style={{ 
        minHeight: "300px",
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden"
      }}
    >
      <Canvas
        camera={{ position: [0, 0.2, 6], fov: 40, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        frameloop={isVisible ? "always" : "never"}
        gl={{
          antialias: true,
          alpha: true,
          // NoToneMapping preserves saturated pink — ACES crushes it
          toneMapping: THREE.NoToneMapping,
        }}
        style={{ background: "transparent" }}
      >
        <React.Suspense fallback={null}>
          <ArmillaryScene />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

useGLTF.preload(
  "/models/armillary_amethyst_optimized.glb",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);
useTexture.preload("/257e1452-aae1-430c-9639-7f2e351caa1c.webp");
