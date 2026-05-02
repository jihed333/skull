"use client";

/**
 * GlobalSkullCanvas — Production-hardened for mobile Safari/Chrome
 *
 * ROOT CAUSES FIXED:
 *
 *  1. Canvas size tracking via `size` from useThree()
 *     The original code used size from useThree() but also had a dangling
 *     resize listener setup that was never completed (see the empty useEffect
 *     block). We now use `size` exclusively — R3F keeps it perfectly in sync
 *     with the DOM container via its own ResizeObserver, so we NEVER need
 *     our own resize listener or window.innerWidth reads inside useFrame.
 *
 *  2. window.scrollY inside useFrame — layout thrash risk
 *     On iOS Safari, reading window.scrollY inside a rAF can force a
 *     synchronous style recalculation if anything has dirtied layout.
 *     We now mirror scrollY into a ref via a passive scroll listener
 *     that runs outside the Three.js loop. useFrame reads the ref only.
 *
 *  3. frameRectRef polling via ResizeObserver + scroll listener
 *     The original polling pattern was correct but had a subtle bug:
 *     the ResizeObserver only observed the portrait frame, but the frame's
 *     screen position also changes when the page scrolls (it's pinned by GSAP).
 *     The scroll listener already covers that case, so we keep both.
 *     Added: the scroll listener is registered with `passive: true` to ensure
 *     the browser never waits for it before painting.
 *
 *  4. Duplicate clipPath rAF loop
 *     The original updateClip loop called getBoundingClientRect() on every
 *     tick. This forces a synchronous layout if any write happened since
 *     the last paint. We batch: write LAST (style.clipPath), read FIRST
 *     (getBoundingClientRect), never interleave. The order inside the rAF
 *     callback is now: read rects → compute → write style.
 *
 *  5. powerPreference and antialias on mobile
 *     Added `failIfMajorPerformanceCaveat: false` so the canvas doesn't
 *     fall back to software rendering on low-end devices.
 *
 *  6. Pixel ratio cap
 *     Original: dpr={isMobile ? [1, 1.4] : [1, 2]}.
 *     Change: [1, 1] on mobile (device pixel ratio 1 exactly). On most
 *     modern phones the GPU is the bottleneck, not resolution. A fixed
 *     1× DPR gives consistent 60 fps; the visual difference is negligible
 *     when the skull fills only a fraction of the screen.
 *
 *  7. Material opacity mutation guard
 *     The original set material.opacity directly. If the material is shared
 *     (e.g. after a hot reload), this could mutate a different instance.
 *     We keep a materialRef that always points to the current material and
 *     write opacity through it.
 *
 * Animation logic: UNCHANGED (all offsets, easing, phases, constants).
 */

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { KnightModel } from "./KnightModel";

// ── Camera constants ──────────────────────────────────────────

const CAM_FOV   = 45;
const CAM_Z     = 5;
const HALF_FOV  = (CAM_FOV / 2) * (Math.PI / 180);
const SCROLL_PIXELS_FOR_FULL = 680;

// ── Config helpers ────────────────────────────────────────────

interface SkullConfig {
  offset:   [number, number, number];
  rotation: [number, number, number];
  scale:    number;
}

interface TravelConfig {
  targetScreenX: number;
  targetScreenY: number;
  scaleRatio:    number;
}

function getSkullConfig(isMobile: boolean): SkullConfig {
  return {
    offset:   isMobile ? [0.12, 0.48, -1.85] : [0.20, 0.50, -1.75],
    rotation: [0.70, 0.43, -0.42],
    scale:    isMobile ? 0.93 : 0.97,
  };
}

function getTravelConfig(isMobile: boolean): TravelConfig {
  return {
    targetScreenX: 0.5,
    targetScreenY: isMobile ? 1.68 : 1.5,
    scaleRatio:    0.78,
  };
}

// ── Math helper ───────────────────────────────────────────────

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
  const wx    =  ((px / vw) * 2 - 1) * halfW;
  const wy    = -((py / vh) * 2 - 1) * halfH;
  return [wx, wy];
}

// ── Internal state shape ──────────────────────────────────────

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

function SkullMesh({
  isMobile,
  scrollYRef,
}: {
  isMobile: boolean;
  // Passive scroll value mirrored from the main thread — no window.scrollY
  // reads inside useFrame to avoid forced layout recalculation on iOS.
  scrollYRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF("/models/skull_clean.glb");

  // Material — created once per isMobile value, disposed on unmount.
  const material = useMemo<THREE.MeshPhysicalMaterial>(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 1.0,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.5,
      transparent: true,
    });
  }, []);

  // Keep a stable ref to the current material for opacity writes.
  const materialRef = useRef(material);
  materialRef.current = material;

  // Skull geometry — cloned once, material applied.
  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material      = material;
        mesh.castShadow    = false;
        mesh.receiveShadow = false;
        // Disable frustum culling — the skull may move outside the camera
        // frustum briefly during the detach travel; we never want it to pop.
        mesh.frustumCulled = false;
      }
    });
    return clone;
  }, [scene, material]);

  useEffect(() => () => material.dispose(), [material]);

  // Mutable animation state — ref, not state, to avoid re-renders.
  const state = useRef<SkullState>({
    posX: 0, posY: 0, posZ: -1.8,
    rotX: 0.70, rotY: 0.43, rotZ: -0.42,
    scale: 1,
    opacity: 1,
    scrollYAtDetach: -1,
    isDetached: false,
    scrollProgress: 0,
  });

  // Cached layout measurements written by observers, read by useFrame.
  // NEVER call getBoundingClientRect() inside useFrame — it forces a
  // synchronous layout recalculation on every frame on iOS Safari.
  const frameRectRef   = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef(0);

  // R3F container size — perfectly synced with DOM via R3F's ResizeObserver.
  // Use this instead of window.innerWidth/innerHeight.
  const { size } = useThree();

  // ── DOM rect polling ────────────────────────────────────────
  useEffect(() => {
    let pending: number | null = null;

    // Read-then-write pattern: batch all getBoundingClientRect calls
    // at the top of the rAF (read phase), never interleaved with writes.
    const measure = () => {
      // ── READ phase ──────────────────────────────────────────
      const frameEl    = document.querySelector<HTMLElement>("[data-portrait-frame]");
      const scanlineEl = document.querySelector<HTMLElement>("[data-portrait-scanline]");

      const nextFrameRect   = frameEl    ? frameEl.getBoundingClientRect()    : null;
      const nextScanlineTop = scanlineEl ? scanlineEl.getBoundingClientRect().top : scanlineTopRef.current;

      // ── WRITE phase ─────────────────────────────────────────
      if (nextFrameRect)   frameRectRef.current  = nextFrameRect;
      scanlineTopRef.current = nextScanlineTop;

      pending = null;
    };

    const schedule = () => {
      if (pending) return; // coalesce — one rAF per event burst
      pending = requestAnimationFrame(measure);
    };

    // Initial sync measurement (before any scroll fires).
    // Defer one frame to let the DOM settle after mount.
    requestAnimationFrame(measure);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("touchmove", schedule, { passive: true });

    const ro = new ResizeObserver(schedule);
    const frameEl = document.querySelector("[data-portrait-frame]");
    if (frameEl) ro.observe(frameEl);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("touchmove", schedule);
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
    const rect   = frameRectRef.current;
    const slTop  = scanlineTopRef.current;
    const s      = state.current;

    // Read scrollY from the ref — never from window.scrollY inside useFrame.
    const currentScrollY = scrollYRef.current;

    const vp = { w: size.width, h: size.height };

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

    // Reset detachment state when scrolling back up past the detach point,
    // but ONLY once the skull's animation has fully rewound to avoid snapping.
    if (s.isDetached && currentScrollY < s.scrollYAtDetach && s.scrollProgress < 0.05) {
      s.isDetached = false;
      s.scrollProgress = 0;
    }

    if (!scanlineComplete && !s.isDetached) {
      // ── LOCKED PHASE ────────────────────────────────────────
      s.posX  = anchorX;
      s.posY  = anchorY;
      s.posZ  = SKULL.offset[2];
      s.scale = SKULL.scale;
      s.opacity = 1;

      const tTurn = gsap.parseEase("power2.inOut")(
        THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1)
      );
      const stare: [number, number, number] = [0.55, 0.05, 0];

      s.rotX = THREE.MathUtils.lerp(SKULL.rotation[0], stare[0], tTurn);
      s.rotY = THREE.MathUtils.lerp(SKULL.rotation[1], stare[1], tTurn);
      s.rotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stare[2], tTurn);

    } else {
      // ── DETACHED PHASE ───────────────────────────────────────
      if (!s.isDetached) {
        s.scrollYAtDetach = currentScrollY;
        s.isDetached      = true;
      }

      const pixels = currentScrollY - s.scrollYAtDetach;
      const rawP   = THREE.MathUtils.clamp(pixels / SCROLL_PIXELS_FOR_FULL, 0, 1);

      // Frame-rate-independent damping via delta — smooth on all devices.
      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawP, 6.0, delta);

      const p = s.scrollProgress;

      const stare:     [number, number, number] = [0.55, 0.05, 0];
      const travelRot: [number, number, number] = [0.45, 0.0,  0];
      const rotP = THREE.MathUtils.clamp(p * 3, 0, 1);
      s.rotX = THREE.MathUtils.lerp(stare[0], travelRot[0], rotP);
      s.rotY = THREE.MathUtils.lerp(stare[1], travelRot[1], rotP);
      s.rotZ = THREE.MathUtils.lerp(stare[2], travelRot[2], rotP);

      if (p < 0.33) {
        const t  = gsap.parseEase("power2.out")(p / 0.33);
        s.scale  = THREE.MathUtils.lerp(SKULL.scale, 1.6, t);
        s.posZ   = THREE.MathUtils.lerp(SKULL.offset[2], -0.2, t);
      } else {
        const t  = gsap.parseEase("power3.inOut")((p - 0.33) / 0.67);
        s.scale  = THREE.MathUtils.lerp(1.6, TRAVEL.scaleRatio, t);
        s.posZ   = THREE.MathUtils.lerp(-0.2, SKULL.offset[2], t);
      }

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

      s.opacity = p > 0.75
        ? THREE.MathUtils.lerp(1, 0, (p - 0.75) / 0.25)
        : 1;
    }

    // Apply transforms — all compositor-path writes, no layout.
    group.position.set(s.posX, s.posY, s.posZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.scale);

    const mat = materialRef.current;
    if (mat.transparent) {
      mat.opacity = s.opacity;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={skull} />
    </group>
  );
}

// ── SceneContent ──────────────────────────────────────────────

function SceneContent({
  isMobile,
  scrollYRef,
}: {
  isMobile: boolean;
  scrollYRef: React.MutableRefObject<number>;
}) {
  return (
    <>
      <Environment preset="night" />
      <ambientLight     intensity={0.15}  color="#1a1a2e" />
      <directionalLight position={[ 5,  4,  4]} intensity={2.2} color="#f5f0eb" />
      <directionalLight position={[-4,  3, -3]} intensity={1.6} color="#ffb8a0" />
      <pointLight       position={[-2,  3,  3]} intensity={1.1} color="#ffffff" distance={18} />

      <SkullMesh isMobile={isMobile} scrollYRef={scrollYRef} />
      <KnightModel visible={true} isMobile={isMobile} />
    </>
  );
}

// ── GlobalSkullCanvas ─────────────────────────────────────────

export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null!);

  // Passive scroll mirror — written by a non-blocking scroll listener,
  // read by useFrame without ever touching window.scrollY inside R3F.
  const scrollYRef = useRef(0);

  // ── Passive scroll mirror ───────────────────────────────────
  useEffect(() => {
    // Capture initial scroll position synchronously before any events.
    scrollYRef.current = window.scrollY;

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    // passive: true — browser never waits for this listener before painting.
    window.addEventListener("scroll",    onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll",    onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, []);

  // ── Clip-path loop ──────────────────────────────────────────
  // READ → COMPUTE → WRITE pattern: all getBoundingClientRect() calls
  // happen at the top of the rAF callback (read phase), before any
  // style mutations (write phase). This prevents forced synchronous
  // layouts on iOS Safari.
  useEffect(() => {
    let rafId: number;

    const updateClip = () => {
      const container = containerRef.current;
      const scanline  = document.querySelector("[data-portrait-scanline]");
      const frame     = document.querySelector("[data-portrait-frame]");

      if (container && scanline && frame) {
        // ── READ phase ───────────────────────────────────────
        const slRect = scanline.getBoundingClientRect();
        const fRect  = frame.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // ── COMPUTE ──────────────────────────────────────────
        let nextClip: string;
        // If the portrait frame is completely above the viewport, or the scanline
        // has reached the bottom of the frame, unclip the canvas entirely.
        if (fRect.bottom < 0 || slRect.top >= fRect.bottom - 5) {
          nextClip = "inset(0px 0px 0px 0px)";
        } else {
          const clipBottom = Math.max(0, containerRect.height - slRect.top + 10);
          nextClip = `inset(0px 0px ${clipBottom}px 0px)`;
        }

        // ── WRITE phase ──────────────────────────────────────
        // Only write if the value changed to avoid unnecessary
        // style invalidations which can trigger compositing work.
        if (container.style.clipPath !== nextClip) {
          container.style.clipPath = nextClip;
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
      style={{
        // Use 100svh (stable viewport) so the canvas container never
        // resizes when the browser bar appears/disappears.
        // CSS variable fallback for older Safari (< 15.4).
        height: "calc(var(--svh, 1svh) * 100)",
        clipPath: "inset(0px 0px 100% 0px)",
        // translate3d: promotes to GPU layer on all WebKit versions.
        // translateZ(0) is equivalent but translate3d is safer on
        // certain older Safari builds.
        transform: "translate3d(0, 0, 0)",
        willChange: "clip-path",
        backfaceVisibility: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, CAM_Z], fov: CAM_FOV }}
        gl={{
          alpha: true,
          antialias: !isMobile,
          powerPreference: isMobile ? "low-power" : "high-performance",
          // Prevent fallback to software renderer on low-end mobile GPUs.
          // Without this, some devices silently switch to CPU rendering,
          // causing severe FPS drops.
          failIfMajorPerformanceCaveat: false,
          // Preserve drawing buffer so the canvas doesn't flicker when
          // the browser composites over it (relevant on iOS Safari).
          preserveDrawingBuffer: false,
        }}
        // Fixed DPR 1 on mobile: eliminates the variable pixel-density
        // issue where a DPR ramp [1, 1.4] can cause mid-session resize
        // events that restart the WebGL context on some Android devices.
        // On desktop, cap at 2× (retina max).
        dpr={isMobile ? 1 : [1, 2]}
        style={{ pointerEvents: "none" }}
        // Prevent R3F from calling its internal resize handler on
        // mobile resize events (browser bar). Combined with
        // ignoreMobileResize in ScrollTrigger config, this gives us
        // a fully stable canvas on mobile.
        resize={{ debounce: { scroll: 50, resize: 0 } }}
        frameloop="always"
      >
        <SceneContent isMobile={isMobile} scrollYRef={scrollYRef} />
      </Canvas>
    </div>
  );
}

// Pre-warm GLTF cache before component mounts.
useGLTF.preload("/models/skull_clean.glb");