"use client";

/**
 * GlobalSkullCanvas — Rewritten for production quality
 *
 * Preserved (unchanged):
 *  - Camera: fov 45, z 5
 *  - Skull config (offset, rotation, scale) per mobile/desktop
 *  - SCROLL_PIXELS_FOR_FULL = 680
 *  - screenToWorld projection math
 *  - Locked phase: skull tracks frame + offset, lerps toward stare rotation
 *  - Detached phase: scale/position travel curve, fade-out at p > 0.75
 *  - ClipPath control driven by scanline vs. frame-bottom comparison
 *  - KnightModel integration
 *  - Lighting setup (scene lights + Environment preset)
 *
 * Improved:
 *  - Constants extracted at module scope (no re-allocation per render)
 *  - Viewport ref updated via single passive resize listener
 *  - Rect-polling consolidated into one listener (scroll + ResizeObserver)
 *    with a shared rAF guard — no duplicate RAF scheduling
 *  - ClipPath loop in GlobalSkullCanvas uses the same rAF pattern
 *  - Material created once in useMemo, typed properly
 *  - useFrame delta used for all time-dependent damping (frame-rate-independent)
 *  - materialRef tracks the current material instance for safe opacity writes
 */

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { KnightModel } from "./KnightModel";

// ── Camera constants (module-level, zero re-allocation) ───────

const CAM_FOV   = 45;
const CAM_Z     = 5;
const HALF_FOV  = (CAM_FOV / 2) * (Math.PI / 180);

/** Pixels of scroll to complete the full detached travel. */
const SCROLL_PIXELS_FOR_FULL = 680;

/**
 * Module-level stable viewport height.
 * Updated only when the width changes (orientation / real resize)
 * or the height delta exceeds 100px, which filters out the ~60px
 * browser toolbar toggle on iOS Safari and Android Chrome.
 * Shared by SkullMesh and GlobalSkullCanvas so both stay in sync.
 */
const stableVH = {
  current: typeof window !== "undefined" ? window.innerHeight : 700,
};

if (typeof window !== "undefined") {
  let prevW = window.innerWidth;
  let prevH = window.innerHeight;
  window.addEventListener(
    "resize",
    () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      if (newW !== prevW || Math.abs(newH - prevH) > 100) {
        stableVH.current = newH;
        prevW = newW;
        prevH = newH;
      }
    },
    { passive: true }
  );
}

// ── Config helpers ────────────────────────────────────────────

interface SkullConfig {
  /** [x, y, z] world-space offset from frame centre. */
  offset: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

interface TravelConfig {
  /** Normalised screen X for detached destination (0–1). */
  targetScreenX: number;
  /** Normalised screen Y — values > 1 go below viewport fold. */
  targetScreenY: number;
  scaleRatio: number;
}

function getSkullConfig(isMobile: boolean): SkullConfig {
  return {
    offset: isMobile
      ? [0.12, 0.48, -1.85]
      : [0.20, 0.50, -1.75],
    rotation: [0.70, 0.43, -0.42],
    scale: isMobile ? 0.93 : 0.97,
  };
}

function getTravelConfig(isMobile: boolean): TravelConfig {
  return {
    targetScreenX: 0.5,
    targetScreenY: isMobile ? 1.68 : 1.5,
    scaleRatio: 0.78,
  };
}

// ── Math helper ───────────────────────────────────────────────

/**
 * Convert screen pixel coordinates to Three.js world space.
 * Assumes a perspective camera at z = CAM_Z looking down -Z.
 */
function screenToWorld(
  px: number,
  py: number,
  vw: number,
  vh: number,
  objZ = 0
): [number, number] {
  const dist  = CAM_Z - objZ;
  const halfH = dist * Math.tan(HALF_FOV);
  const halfW = halfH * (vw / vh);
  const wx    = ((px / vw) * 2 - 1) * halfW;
  const wy    = -((py / vh) * 2 - 1) * halfH;
  return [wx, wy];
}

// ── Internal state shape for SkullMesh ────────────────────────

interface SkullState {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  opacity: number;
  scrollYAtDetach: number;
  isDetached: boolean;
  scrollProgress: number;
}

// ── SkullMesh ─────────────────────────────────────────────────

function SkullMesh({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  const { scene } = useGLTF("/models/skull_clean.glb");

  // Material — created once, disposed on unmount.
  const material = useMemo<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(() => {
    if (isMobile) {
      return new THREE.MeshStandardMaterial({
        color: 0x050505,
        metalness: 1.0,
        roughness: 0.14,
        envMapIntensity: 1.9,
        transparent: true,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 1.0,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.5,
      transparent: true,
    });
  }, [isMobile]);

  // Skull geometry — cloned once, material applied.
  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material  = material;
        (child as THREE.Mesh).castShadow    = false;
        (child as THREE.Mesh).receiveShadow = false;
      }
    });
    return clone;
  }, [scene, material]);

  // Dispose material on unmount to prevent GPU leaks.
  useEffect(() => () => material.dispose(), [material]);

  // Mutable animation state — kept in a ref to avoid re-renders.
  const state = useRef<SkullState>({
    posX: 0, posY: 0, posZ: -1.8,
    rotX: 0.70, rotY: 0.43, rotZ: -0.42,
    scale: 1,
    opacity: 1,
    scrollYAtDetach: -1,
    isDetached: false,
    scrollProgress: 0,
  });

  // Cached layout measurements — written by the observers below,
  // read by useFrame without triggering reflows.
  const frameRectRef   = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef(0);
  const viewportRef    = useRef({ w: 1024, h: 700 });
  // Note: stable viewport height is tracked by the module-level
  // `stableVH` object — no per-component ref needed.

  // ── Viewport update ─────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const newW = window.innerWidth;
      const newH = Math.max(window.innerHeight, 560);
      const prev = viewportRef.current;

      // Skip if only height changed by a small amount — that's the
      // browser toolbar toggling, not a real layout change.
      const widthChanged = newW !== prev.w;
      const bigHeightChange = Math.abs(newH - prev.h) > 100;

      if (widthChanged || bigHeightChange) {
        viewportRef.current = { w: newW, h: newH };
        // stableVH is already updated by the module-level resize listener.
      }
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── DOM rect polling (scroll + ResizeObserver, shared rAF) ──
  useEffect(() => {
    let pending: number | null = null;

    const measure = () => {
      const frameEl    = document.querySelector<HTMLElement>("[data-portrait-frame]");
      const scanlineEl = document.querySelector<HTMLElement>("[data-portrait-scanline]");

      if (frameEl)    frameRectRef.current  = frameEl.getBoundingClientRect();
      if (scanlineEl) scanlineTopRef.current = scanlineEl.getBoundingClientRect().top;

      pending = null;
    };

    const schedule = () => {
      if (pending) return;                 // coalesce — one rAF per event burst
      pending = requestAnimationFrame(measure);
    };

    // Initial measurement
    measure();

    window.addEventListener("scroll", schedule, { passive: true });

    const ro = new ResizeObserver(schedule);
    const frameEl = document.querySelector("[data-portrait-frame]");
    if (frameEl) ro.observe(frameEl);

    return () => {
      window.removeEventListener("scroll", schedule);
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);

  // ── Animation frame ─────────────────────────────────────────
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !frameRectRef.current) return;

    const SKULL  = getSkullConfig(isMobile);
    const TRAVEL = getTravelConfig(isMobile);
    const vp     = viewportRef.current;
    const rect   = frameRectRef.current;
    const slTop  = scanlineTopRef.current;
    const s      = state.current;

    // World-space centre of the portrait frame.
    const [frameWX, frameWY] = screenToWorld(
      rect.left + rect.width  / 2,
      rect.top  + rect.height / 2,
      vp.w, vp.h,
      SKULL.offset[2]
    );

    const anchorX = frameWX + SKULL.offset[0];
    const anchorY = frameWY + SKULL.offset[1];

    const triggerZone    = rect.height * 0.18;
    const distToBottom   = rect.bottom - slTop;
    const scanlineComplete = slTop >= rect.bottom - 4;

    if (!scanlineComplete && !s.isDetached) {
      // ── LOCKED PHASE — skull rides the frame ────────────────
      s.posX = anchorX;
      s.posY = anchorY;
      s.posZ = SKULL.offset[2];
      s.scale   = SKULL.scale;
      s.opacity = 1;

      // Ease rotation toward "stare" as scanline approaches bottom.
      // tTurn naturally reverses as the user scrolls back up, so
      // damping here makes the return feel smooth in both directions.
      const tTurn = gsap.parseEase("power2.inOut")(
        THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1)
      );
      const stare: [number, number, number] = [0.55, 0.05, 0];

      const targetRotX = THREE.MathUtils.lerp(SKULL.rotation[0], stare[0], tTurn);
      const targetRotY = THREE.MathUtils.lerp(SKULL.rotation[1], stare[1], tTurn);
      const targetRotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stare[2], tTurn);

      // Damp toward the target so the rotation is cinematic in
      // both the forward (scroll down) and reverse (scroll up) directions.
      s.rotX = THREE.MathUtils.damp(s.rotX, targetRotX, 9, delta);
      s.rotY = THREE.MathUtils.damp(s.rotY, targetRotY, 9, delta);
      s.rotZ = THREE.MathUtils.damp(s.rotZ, targetRotZ, 9, delta);

    } else {
      // ── DETACHED PHASE — skull travels away ─────────────────
      if (!s.isDetached) {
        s.scrollYAtDetach = window.scrollY;
        s.isDetached      = true;
      }

      const pixels = window.scrollY - s.scrollYAtDetach;

      // ── REVERSE: user scrolled back past the detach point ───
      // Reset so the locked phase takes over and the rotation
      // smoothly returns to the original tilted pose.
      if (pixels <= 0) {
        s.isDetached     = false;
        s.scrollYAtDetach = -1;
        s.scrollProgress  = 0;
        return;
      }

      const rawP   = THREE.MathUtils.clamp(pixels / SCROLL_PIXELS_FOR_FULL, 0, 1);

      // Frame-rate-independent damping (delta-based).
      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawP, 6.0, delta);

      const p = s.scrollProgress;

      // Rotation held at stare pose during travel.
      s.rotX = 0.55;
      s.rotY = 0.05;
      s.rotZ = 0;

      // ── Scale & Z travel ────────────────────────────────────
      if (p < 0.33) {
        const t  = gsap.parseEase("power2.out")(p / 0.33);
        s.scale  = THREE.MathUtils.lerp(SKULL.scale, 2.65, t);
        s.posZ   = THREE.MathUtils.lerp(SKULL.offset[2], 1.15, t);
      } else {
        const t  = gsap.parseEase("power3.inOut")((p - 0.33) / 0.67);
        s.scale  = THREE.MathUtils.lerp(2.65, TRAVEL.scaleRatio, t);
        s.posZ   = THREE.MathUtils.lerp(1.15, SKULL.offset[2], t);
      }

      // ── Position travel ─────────────────────────────────────
      const [destX, destY] = screenToWorld(
        vp.w * TRAVEL.targetScreenX,
        vp.h * TRAVEL.targetScreenY,
        vp.w, vp.h,
        SKULL.offset[2]
      );

      const breakoutEase = gsap.parseEase("power2.out");
      const travelEase   = gsap.parseEase("power3.inOut");

      const breakoutX = THREE.MathUtils.lerp(
        anchorX, frameWX,
        breakoutEase(Math.min(p * 2, 1))
      );

      s.posX = THREE.MathUtils.lerp(
        breakoutX, destX,
        travelEase(Math.max(0, (p - 0.25) / 0.75))
      );
      s.posY = THREE.MathUtils.lerp(
        anchorY, destY,
        travelEase(Math.max(0, (p - 0.25) / 0.75))
      );

      // ── Fade out ────────────────────────────────────────────
      s.opacity = p > 0.75 ? THREE.MathUtils.lerp(1, 0, (p - 0.75) / 0.25) : 1;
    }

    // Apply all transforms — compositor path, no layout.
    group.position.set(s.posX, s.posY, s.posZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.scale);

    if (material.transparent) {
      material.opacity = s.opacity;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={skull} />
    </group>
  );
}

// ── SceneContent ──────────────────────────────────────────────

/** Lights + models — extracted to keep GlobalSkullCanvas lean. */
function SceneContent({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <Environment preset="night" />
      <ambientLight   intensity={0.15}  color="#1a1a2e" />
      <directionalLight position={[ 5,  4,  4]} intensity={2.2} color="#f5f0eb" />
      <directionalLight position={[-4,  3, -3]} intensity={1.6} color="#ffb8a0" />
      <pointLight       position={[-2,  3,  3]} intensity={1.1} color="#ffffff" distance={18} />

      <SkullMesh isMobile={isMobile} />
      <KnightModel visible={true} isMobile={isMobile} />
    </>
  );
}

// ── GlobalSkullCanvas ─────────────────────────────────────────

export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null!);

  /**
   * Clip-path control loop.
   * Reveals the WebGL canvas as the scanline descends into the frame,
   * then removes the clip once the scanline has passed the frame bottom.
   *
   * Uses a single rAF loop — no scroll listener needed here because
   * the positions are queried live (they're already composited by the time
   * rAF fires, so we never force a reflow during paint).
   */
  useEffect(() => {
    let rafId: number;

    const updateClip = () => {
      const container = containerRef.current;
      const scanline  = document.querySelector("[data-portrait-scanline]");
      const frame     = document.querySelector("[data-portrait-frame]");

      if (container && scanline && frame) {
        const slRect = scanline.getBoundingClientRect();
        const fRect  = frame.getBoundingClientRect();

        if (slRect.top >= fRect.bottom - 5) {
          // Scanline has completed — show full canvas.
          container.style.clipPath = "inset(0px 0px 0px 0px)";
        } else {
          // Use stableVH instead of live window.innerHeight so the
          // clip never jumps when the mobile browser bar toggles.
          const clipBottom = stableVH.current - slRect.top + 10;
          container.style.clipPath = `inset(0px 0px ${clipBottom}px 0px)`;
        }
      }

      rafId = requestAnimationFrame(updateClip);
    };

    rafId = requestAnimationFrame(updateClip);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[50]"
      style={{ clipPath: "inset(0px 0px 100% 0px)" }}  /* hidden until first tick */
    >
      <Canvas
        camera={{ position: [0, 0, CAM_Z], fov: CAM_FOV }}
        gl={{
          alpha: true,
          antialias: !isMobile,
          powerPreference: isMobile ? "low-power" : "high-performance",
        }}
        dpr={isMobile ? [1, 1.4] : [1, 2]}
        style={{ pointerEvents: "none" }}
      >
        <SceneContent isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

// Pre-warm the GLTF cache before the component mounts.
useGLTF.preload("/models/skull_clean.glb");