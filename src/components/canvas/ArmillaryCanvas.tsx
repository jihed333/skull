"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

/*
  ═══════════════════════════════════════════════════════════════
  ARMILLARY SPHERE — Premium Contact Section Hero

  Lazy loading strategy:
  ─────────────────────
  Phase 1 — HIDDEN  : Canvas does not exist in the DOM. Zero GPU cost.
  Phase 2 — MOUNTED : Section enters viewport (rootMargin 200px ahead).
                      Canvas is created, GLB starts downloading.
                      Canvas is still invisible (opacity: 0).
  Phase 3 — VISIBLE : Section actually enters viewport (threshold 0.05).
                      Smooth CSS fade-in over 1.2s (cubic-bezier).
  Phase 4 — IDLE    : Section exits viewport fully.
                      frameloop switches to "demand" — GPU pauses.
                      Canvas stays mounted (no re-download on scroll back).
  Phase 5 — RESUME  : Section re-enters viewport.
                      frameloop switches back to "always". Instant.

  Key difference from naive implementations:
  · MOUNTED fires once and stays true forever (no destroy/re-create).
  · VISIBLE drives only the CSS opacity — not canvas existence.
  · frameloop "demand" saves GPU when out of view, "always" when in view.
  ═══════════════════════════════════════════════════════════════
*/

// ─── Shared mouse state ────────────────────────────────────────
const mouseState = { x: 0, y: 0 };

// ─── Material detection ────────────────────────────────────────
function isGemMaterial(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  const name = mat.name.toLowerCase();
  if (
    name.includes("gem") || name.includes("amethyst") ||
    name.includes("crystal") || name.includes("stone") ||
    name.includes("lambert8")
  ) return true;
  const hsl = { h: 0, s: 0, l: 0 };
  mat.color.getHSL(hsl);
  return hsl.h > 0.6 && hsl.h < 0.9 && hsl.s > 0.2;
}

function isMetalFrame(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return false;
  const name = mat.name.toLowerCase();
  if (
    name.includes("gold") || name.includes("metal") ||
    name.includes("frame") || name.includes("ring") ||
    name.includes("band") || name.includes("rings") ||
    name.includes("body") || name.includes("platform")
  ) return true;
  return mat.metalness > 0.5;
}

// ─── Fade-in controller — animates opacity 0→1 after mount ─────
// Runs inside the Canvas so it has access to useFrame.
// Drives a ref on the outer div via a callback, keeping React
// renders at zero (no state updates during the fade).
interface FadeProps {
  onFadeComplete?: () => void;
}
function FadeIn({ onFadeComplete }: FadeProps) {
  const opacityRef = useRef(0);
  const doneRef = useRef(false);

  useFrame((_, delta) => {
    if (doneRef.current) return;
    opacityRef.current = Math.min(opacityRef.current + delta * 0.9, 1);
    // We can't directly set the div style from inside Canvas —
    // instead we expose progress via a custom event on the canvas element
    const canvas = document.querySelector("[data-armillary-canvas]") as HTMLDivElement | null;
    if (canvas) {
      canvas.style.opacity = String(opacityRef.current);
    }
    if (opacityRef.current >= 1) {
      doneRef.current = true;
      onFadeComplete?.();
    }
  });

  return null;
}

// ─── Inner 3D Scene ────────────────────────────────────────────
interface ArmillarySceneProps {
  onReady: () => void;
}

function ArmillaryScene({ onReady }: ArmillarySceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothMouse = useRef({ x: 0, y: 0 });
  const readyFired = useRef(false);

  const { camera, scene: threeScene } = useThree();
  const { scene: gltfScene, animations } = useGLTF(
    "/models/armillary_amethyst_optimized.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  const customTexture = useTexture("/257e1452-aae1-430c-9639-7f2e351caa1c.webp");
  const { actions } = useAnimations(animations, groupRef);

  // Fire onReady once the scene + texture are in memory
  useEffect(() => {
    if (!readyFired.current && gltfScene && customTexture) {
      readyFired.current = true;
      // Small delay lets R3F finish its first paint before we start fading in
      const t = setTimeout(onReady, 120);
      return () => clearTimeout(t);
    }
  }, [gltfScene, customTexture, onReady]);

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

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    gltfScene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (groupRef.current) {
      groupRef.current.scale.setScalar(2.2 / maxDim);
    }

    customTexture.flipY = false;
    customTexture.colorSpace = THREE.SRGBColorSpace;
    customTexture.needsUpdate = true;

    gltfScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;

      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach((mat, idx) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;

        if (isGemMaterial(mat)) {
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
          if (Array.isArray(child.material)) child.material[idx] = gemMat;
          else child.material = gemMat;
        } else if (isMetalFrame(mat)) {
          mat.map = customTexture;
          mat.color.set("#ffffff");
          mat.metalness = 0.95;
          mat.roughness = 0.15;
          mat.envMapIntensity = 1.5;
          mat.transparent = false;
          mat.depthWrite = true;
          (mat as THREE.MeshPhysicalMaterial).specularIntensity = 1;
          mat.needsUpdate = true;
        } else {
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

    threeScene.fog = new THREE.FogExp2(0x080810, 0.07);
  }, [gltfScene, threeScene, customTexture]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseState.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseState.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    smoothMouse.current.x = THREE.MathUtils.damp(smoothMouse.current.x, mouseState.x, 3, delta);
    smoothMouse.current.y = THREE.MathUtils.damp(smoothMouse.current.y, mouseState.y, 3, delta);

    groupRef.current.position.y = Math.sin(t * 0.4) * 0.04;
    groupRef.current.position.x = 0;
    groupRef.current.rotation.y += delta * 0.18;

    camera.position.x = Math.sin(t * 0.08) * 0.1 + smoothMouse.current.x * 0.2;
    camera.position.y = 0.2 + Math.cos(t * 0.06) * 0.08 + smoothMouse.current.y * 0.1;
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltfScene} />
      <ambientLight color="#10101a" intensity={0.2} />
      <directionalLight position={[3, 8, 4]} intensity={3.0} color="#f0f4ff" />
      <directionalLight position={[-6, 3, -6]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-5, 2, -6]} intensity={1.0} color="#ff98a2" />
      <pointLight position={[0, -2, 3]} intensity={0.5} color="#ffe0ea" distance={20} />
      <pointLight position={[4, -1, -2]} intensity={0.4} color="#ffd4e0" distance={15} />
      <Environment preset="studio" environmentIntensity={1.8} />
    </group>
  );
}

// ─── Public component ──────────────────────────────────────────
export default function ArmillaryCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  // MOUNTED: has the section come close enough to start loading?
  // Once true, stays true forever — we never unmount the Canvas.
  const [mounted, setMounted] = useState(false);

  // IN_VIEW: is the section currently visible?
  // Drives frameloop only — not Canvas existence.
  const [inView, setInView] = useState(false);

  // SCENE_READY: has the GLB + texture finished loading?
  // Starts the smooth fade-in.
  const [sceneReady, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Observer 1 — fires 300px BEFORE the section enters the viewport.
    // This pre-mounts the Canvas so the GLB can start downloading early,
    // but the section isn't visible yet so the user sees nothing.
    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMounted(true);
          preloadObserver.disconnect(); // fire once, never needed again
        }
      },
      { rootMargin: "300px 0px", threshold: 0 }
    );

    // Observer 2 — fires when the section is actually visible (5% in view).
    // Controls frameloop active/idle and drives the initial fade-in.
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting);
      },
      { rootMargin: "0px 0px", threshold: 0.05 }
    );

    preloadObserver.observe(el);
    visibilityObserver.observe(el);

    return () => {
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[0]"
      style={{ minHeight: "300px" }}
    >
      {mounted && (
        /*
          The wrapper div starts at opacity:0.
          When sceneReady fires, a CSS transition kicks in to opacity:1.
          The FadeIn component inside the Canvas also animates it
          frame-by-frame for a smoother eased curve.
          Two-layer approach: CSS transition = guarantee, RAF = smoothness.
        */
        <div
          data-armillary-canvas
          className="absolute inset-0"
          style={{
            opacity: 0,
            // CSS transition as fallback in case FadeIn hasn't run yet
            transition: sceneReady
              ? "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
          }}
          // When sceneReady triggers, set opacity:1 via CSS transition
          ref={(el) => {
            if (el && sceneReady && inView) {
              // Let the CSS transition handle it
              requestAnimationFrame(() => {
                el.style.opacity = "1";
              });
            }
          }}
        >
          <Canvas
            camera={{ position: [0, 0.2, 6], fov: 40, near: 0.1, far: 100 }}
            dpr={[1, 1.5]} // Slightly reduced from [1,2] — saves VRAM with no visible diff
            frameloop={inView ? "always" : "demand"}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.NoToneMapping,
              // Power preference: high-performance only when in view
              powerPreference: inView ? "high-performance" : "default",
            }}
            style={{ background: "transparent" }}
          >
            <React.Suspense fallback={null}>
              <ArmillaryScene onReady={handleSceneReady} />
              {sceneReady && inView && <FadeIn />}
            </React.Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
}

// No preload here — the whole point is lazy loading.
// useGLTF.preload would immediately download the GLB on page load,
// defeating the purpose. The preloadObserver handles early loading instead.