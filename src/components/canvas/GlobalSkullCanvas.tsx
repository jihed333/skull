"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { KnightModel } from "./KnightModel";
import { useScrollContext } from "@/components/providers/SmoothScrollProvider";

const CAMERA = { fov: 45, z: 5 } as const;
const HALF_FOV_RAD = (CAMERA.fov / 2) * (Math.PI / 180);

// ─── Skull config ─────────────────────────────────────────────────────────────
function getSkullConfig() {
  return {
    offset: [0.20, 0.50, -1.75] as [number, number, number],
    rotation: [0.70, 0.43, -0.42] as [number, number, number],
    scale: 0.97,
  };
}

// ─── Materials ────────────────────────────────────────────────────────────────
const SKULL_MATERIAL_DESKTOP = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0x050505),
  metalness: 1.0,
  roughness: 0.08,
  reflectivity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  envMapIntensity: 2.5,
  transparent: true,
});

const SKULL_MATERIAL_MOBILE = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x050505),
  metalness: 1.0,
  roughness: 0.12,
  envMapIntensity: 2.0,
  transparent: true,
});

// ─── Lights ───────────────────────────────────────────────────────────────────
const LIGHTS = [
  { type: "dir", position: [5, 3, 4], intensity: 2.5, color: "#f5f0eb" },
  { type: "dir", position: [-4, 2, -3], intensity: 1.8, color: "#ffb8a0" },
  { type: "point", position: [-2, 3, 3], intensity: 1.2, color: "#ffffff", distance: 15 },
  { type: "ambient", intensity: 0.1, color: "#1a1a2e" },
] as const;

// ─── Travel config ────────────────────────────────────────────────────────────
function getTravelConfig() {
  return {
    targetScreenX: 0.5,
    targetScreenY: 0.35,
    scaleRatio: 0.8,
    yawDelta: -0.45,
    pitchDelta: -0.05,
  };
}

const SCROLL_PIXELS_FOR_FULL = 600;

// Uses STABLE cached viewport — never reads live window.innerHeight inside rAF/useFrame
function screenToWorld(
  px: number, py: number,
  vw: number, vh: number,
  objZ: number = 0
): [number, number] {
  const dist = CAMERA.z - objZ;
  const halfH = dist * Math.tan(HALF_FOV_RAD);
  const halfW = halfH * (vw / vh);
  const wx = ((px / vw) * 2 - 1) * halfW;
  const wy = -((py / vh) * 2 - 1) * halfH;
  return [wx, wy];
}

function elementCenterToWorld(
  rect: DOMRect, vw: number, vh: number, objZ: number = 0
): [number, number] {
  return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, vw, vh, objZ);
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: Stable scroll position tracker using passive listener + ref
// On iOS, window.scrollY read inside rAF/useFrame causes layout flush and
// interacts badly with momentum scroll → produces jitter/trembling.
// Instead we track scroll in a passive listener and read from a ref.
// ─────────────────────────────────────────────────────────────────────────────
function useStableScroll() {
  const scrollYRef = useRef(0);

  useEffect(() => {
    // Initialise immediately
    scrollYRef.current = window.scrollY;

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    // passive + capture to get the value as early as possible each frame
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollYRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: Stable viewport dimensions
// On mobile Safari the URL bar hide/show changes window.innerHeight by ~50-80px
// at random moments.  Reading it inside useFrame => skull jumps every time the
// bar appears/disappears.  We lock the value at mount and only update on RESIZE.
// We also use visualViewport when available — it reports the *stable* layout
// height independent of the browser chrome.
// ─────────────────────────────────────────────────────────────────────────────
function useStableViewport() {
  const vpRef = useRef({ w: 1, h: 1 });

  useEffect(() => {
    const snap = () => {
      // visualViewport gives us the stable inner height on iOS Safari
      const vv = window.visualViewport;
      vpRef.current = {
        w: vv ? vv.width : window.innerWidth,
        h: vv ? vv.height : window.innerHeight,
      };
    };
    snap();

    // Only re-snap on genuine resize (orientation change, etc.) — NOT on scroll
    window.addEventListener("resize", snap);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", snap);
    }
    return () => {
      window.removeEventListener("resize", snap);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", snap);
      }
    };
  }, []);

  return vpRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: Stable rect cache updated only in scroll/resize listeners
// getBoundingClientRect() inside useFrame forces a FULL LAYOUT RECALCULATION
// every frame — the single largest source of CPU jank on mobile.
// We cache in passive scroll + ResizeObserver and read from refs.
// ─────────────────────────────────────────────────────────────────────────────
function useStableRects() {
  const frameRectRef = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const frame = document.querySelector("[data-portrait-frame]");
      const scanline = document.querySelector("[data-portrait-scanline]");
      if (frame) frameRectRef.current = frame.getBoundingClientRect();
      if (scanline) scanlineTopRef.current = scanline.getBoundingClientRect().top;
    };

    update();

    window.addEventListener("scroll", update, { passive: true });

    const ro = new ResizeObserver(update);
    const frame = document.querySelector("[data-portrait-frame]");
    if (frame) ro.observe(frame);
    document.querySelectorAll("[data-portrait-scanline]").forEach(el => ro.observe(el));

    return () => {
      window.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return { frameRectRef, scanlineTopRef };
}

// ─── Skull Mesh ───────────────────────────────────────────────────────────────
function SkullMesh({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const material = isMobile ? SKULL_MATERIAL_MOBILE : SKULL_MATERIAL_DESKTOP;

  const { scene } = useGLTF(
    "/models/skull_clean.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.5/"
  );

  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = !isMobile;
      }
    });
    return clone;
  }, [scene, material, isMobile]);

  const easeRotate = useMemo(() => gsap.parseEase("power2.inOut"), []);
  const easeTravel = useMemo(() => gsap.parseEase("power3.inOut"), []);

  const state = useRef({
    posX: 0, posY: 0, posZ: -1.75,
    rotX: 0.70, rotY: 0.43, rotZ: -0.42,
    scale: 1.08,
    opacity: 1,
    // KEY FIX: smooth intermediary targets — lerp toward these each frame
    // instead of snapping to raw scroll-derived values.
    smoothX: 0, smoothY: 0, smoothZ: -1.75,
    smoothScale: 1.08,
    scrollProgress: 0,
    scrollYAtDetach: -1,
    isDetached: false,
  });

  // Use stable hooks — no live DOM reads inside useFrame
  const scrollYRef = useStableScroll();
  const vpRef = useStableViewport();
  const { frameRectRef, scanlineTopRef } = useStableRects();

  // KEY FIX: damping constants tuned per platform
  // Mobile needs SLOWER damping so frame-rate variance doesn't cause oscillation.
  // Desktop can afford faster damping for snappier feel.
  const DAMP_POS  = isMobile ? 6  : 10;
  const DAMP_SCL  = isMobile ? 5  : 9;
  const DAMP_PROG = isMobile ? 3  : 4;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // KEY FIX: clamp delta to avoid huge jumps after tab-switch / background wake
    const dt = Math.min(delta, 0.05);

    const SKULL = getSkullConfig();
    const TRAVEL = getTravelConfig();

    const frameRect = frameRectRef.current;
    if (!frameRect) return;

    const s = state.current;

    // Read from stable refs — NO live DOM/window reads here
    const slTop = scanlineTopRef.current;
    const scrollY = scrollYRef.current;
    const vp = vpRef.current;

    // ── Scanline completion check ─────────────────────────────────────────────
    const distToBottom = frameRect.bottom - slTop;
    const triggerZone = frameRect.height * 0.15;
    const scanlineEndProgress = THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1);

    let scanlineComplete = s.isDetached;
    if (!s.isDetached && slTop >= frameRect.bottom - 2) scanlineComplete = true;
    if (s.isDetached && slTop < frameRect.bottom - 20) scanlineComplete = false;

    // ── Live anchor ───────────────────────────────────────────────────────────
    const [frameWorldX, frameWorldY] = elementCenterToWorld(frameRect, vp.w, vp.h, SKULL.offset[2]);
    const liveAnchorX = frameWorldX + SKULL.offset[0];
    const liveAnchorY = frameWorldY + SKULL.offset[1];

    // ── Compute RAW target position & scale ───────────────────────────────────
    let targetX: number, targetY: number, targetZ: number, targetScale: number;
    let targetRotX: number, targetRotY: number, targetRotZ: number;
    let targetOpacity = 1;

    if (!scanlineComplete) {
      // ══ PHASE 1: LOCKED ════════════════════════════════════════════════════
      targetX = liveAnchorX;
      targetY = liveAnchorY;
      targetZ = SKULL.offset[2];

      const pInitialTurn = easeRotate(scanlineEndProgress);
      const stareRot = [0.55, 0.05, 0.0] as const;

      targetRotX = THREE.MathUtils.lerp(SKULL.rotation[0], stareRot[0], pInitialTurn);
      targetRotY = THREE.MathUtils.lerp(SKULL.rotation[1], stareRot[1], pInitialTurn);
      targetRotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stareRot[2], pInitialTurn);

      targetScale = SKULL.scale;
      targetOpacity = 1;

      s.scrollProgress = 0;
      s.scrollYAtDetach = -1;
      s.isDetached = false;

    } else {
      // ══ PHASES 2–4: DETACHED ══════════════════════════════════════════════
      if (!s.isDetached) {
        s.scrollYAtDetach = scrollY;
        s.isDetached = true;
      }

      const pixelsScrolled = scrollY - s.scrollYAtDetach;
      const rawProgress = THREE.MathUtils.clamp(pixelsScrolled / SCROLL_PIXELS_FOR_FULL, 0, 1);

      // KEY FIX: damp scroll progress using stable dt — prevents lurching on
      // frames that arrive late (common on mobile under thermal throttle)
      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawProgress, DAMP_PROG, dt);
      const p = s.scrollProgress;

      const stareRot = [0.55, 0.05, 0.0] as const;
      targetRotX = stareRot[0];
      targetRotY = stareRot[1];
      targetRotZ = stareRot[2];

      const maxPopScale = 2.8;
      const pPop    = THREE.MathUtils.clamp(p / 0.3, 0, 1);
      const pTravel = THREE.MathUtils.clamp(p / 1.0, 0, 1);
      const zPunch  = 1.2;

      if (p < 0.3) {
        targetScale = THREE.MathUtils.lerp(SKULL.scale, maxPopScale, easeRotate(pPop));
        targetZ     = THREE.MathUtils.lerp(SKULL.offset[2], zPunch, easeRotate(pPop));
      } else {
        const pTravelScale = THREE.MathUtils.clamp((p - 0.3) / 0.7, 0, 1);
        targetScale = THREE.MathUtils.lerp(maxPopScale, TRAVEL.scaleRatio, easeTravel(pTravelScale));
        targetZ     = THREE.MathUtils.lerp(zPunch, SKULL.offset[2], easeTravel(pTravelScale));
      }

      const [destX, destY] = screenToWorld(
        vp.w * TRAVEL.targetScreenX,
        vp.h * 1.5,
        vp.w, vp.h,
        SKULL.offset[2]
      );

      const breakoutAnchorX = THREE.MathUtils.lerp(liveAnchorX, frameWorldX, easeRotate(pPop));
      targetX = THREE.MathUtils.lerp(breakoutAnchorX, destX, easeTravel(pTravel));
      targetY = THREE.MathUtils.lerp(liveAnchorY, destY, easeTravel(pTravel));

      const fadeStart = 0.75;
      const fadeP = THREE.MathUtils.clamp((pTravel - fadeStart) / (1 - fadeStart), 0, 1);
      targetOpacity = 1 - easeTravel(fadeP);
    }

    // ── KEY FIX: Smooth all values through damp — never snap ─────────────────
    // This is the core fix for mobile trembling: even if the scroll listener
    // gives us a slightly noisy rect or scrollY, damping absorbs the noise
    // and produces butter-smooth interpolated values every frame.
    s.smoothX     = THREE.MathUtils.damp(s.smoothX,     targetX!,     DAMP_POS, dt);
    s.smoothY     = THREE.MathUtils.damp(s.smoothY,     targetY!,     DAMP_POS, dt);
    s.smoothZ     = THREE.MathUtils.damp(s.smoothZ,     targetZ!,     DAMP_POS, dt);
    s.smoothScale = THREE.MathUtils.damp(s.smoothScale, targetScale!, DAMP_SCL, dt);

    // Rotations — direct lerp is fine (they change slowly)
    s.rotX = THREE.MathUtils.lerp(s.rotX, targetRotX!, 0.08);
    s.rotY = THREE.MathUtils.lerp(s.rotY, targetRotY!, 0.08);
    s.rotZ = THREE.MathUtils.lerp(s.rotZ, targetRotZ!, 0.08);

    // Opacity — direct lerp
    s.opacity = THREE.MathUtils.lerp(s.opacity, targetOpacity, 0.07);

    // ── Write to Three.js object ──────────────────────────────────────────────
    group.position.set(s.smoothX, s.smoothY, s.smoothZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.smoothScale);
    material.opacity = s.opacity;
  });

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>}>
      <primitive object={skull} />
    </group>
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────
function SceneContent({ isMobile }: { isMobile: boolean }) {
  const { scrollProgress } = useScrollContext();

  return (
    <>
      <Environment preset="night" />
      {LIGHTS.map((l, i) =>
        l.type === "dir" ? (
          <directionalLight key={i} position={l.position as any} intensity={l.intensity} color={l.color} />
        ) : l.type === "point" ? (
          <pointLight key={i} position={l.position as any} intensity={l.intensity} distance={(l as any).distance} />
        ) : (
          <ambientLight key={i} intensity={l.intensity} />
        )
      )}
      <SkullMesh isMobile={isMobile} />
      <KnightModel visible={scrollProgress >= 0.35} isMobile={isMobile} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: Clip-path animation — deduplicated into a single stable rAF loop
// using a ref-based scroll value. The original read window.innerHeight every
// frame which on iOS causes the clip to jump when the URL bar toggles.
// ─────────────────────────────────────────────────────────────────────────────
function useClipPath(
  containerRef: React.RefObject<HTMLDivElement>,
  isMobile: boolean
) {
  // Stable viewport height — locked at mount, updated only on resize
  const stableVhRef = useRef(0);

  useEffect(() => {
    const snap = () => {
      const vv = window.visualViewport;
      stableVhRef.current = vv ? vv.height : window.innerHeight;
    };
    snap();
    window.addEventListener("resize", snap);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", snap);
    return () => {
      window.removeEventListener("resize", snap);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", snap);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    // KEY FIX: throttle mobile to ~30fps for clip-path updates
    // clip-path changes trigger compositor re-rasterise — doing this 60×/s on
    // mobile is wasteful and contributes to thermal throttle → jitter.
    const MOBILE_FRAME_MS = 32;

    const updateClipPath = (time: number) => {
      if (isMobile && time - lastTime < MOBILE_FRAME_MS) {
        rafId = requestAnimationFrame(updateClipPath);
        return;
      }
      lastTime = time;

      const container = containerRef.current;
      const scanline = document.querySelector("[data-portrait-scanline]");
      const frame = document.querySelector("[data-portrait-frame]");

      if (container && scanline && frame) {
        const slRect = scanline.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();

        if (slRect.top >= frameRect.bottom - 2) {
          container.style.clipPath = "inset(0px 0px 0px 0px)";
        } else if (slRect.top <= frameRect.top + 2) {
          container.style.clipPath = "inset(0px 0px 100% 0px)";
        } else {
          // KEY FIX: use stableVhRef instead of window.innerHeight
          // to avoid clip jumping when URL bar shows/hides on iOS
          const bottomClip = stableVhRef.current - slRect.top;
          container.style.clipPath = `inset(0px 0px ${bottomClip}px 0px)`;
        }
      }

      rafId = requestAnimationFrame(updateClipPath);
    };

    rafId = requestAnimationFrame(updateClipPath);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, containerRef]);
}

// ─── Exported canvas ──────────────────────────────────────────────────────────
export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useClipPath(containerRef, isMobile);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[50]"
      style={{ clipPath: "inset(0px 0px 100% 0px)" }}
    >
      <Canvas
        camera={{ position: [0, 0, CAMERA.z], fov: CAMERA.fov }}
        gl={{
          alpha: true,
          antialias: !isMobile,
          powerPreference: isMobile ? "low-power" : "high-performance",
          // KEY FIX: disable preserveDrawingBuffer on mobile — it forces a full
          // framebuffer copy every frame which tanks performance on iOS GPU
          preserveDrawingBuffer: false,
        }}
        // KEY FIX: on mobile cap DPR at 1.5 max to halve GPU fill-rate cost.
        // Going to 2.0+ on a 390px wide display at 60fps was the main GPU bottleneck.
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        // KEY FIX: frameloop="demand" is tempting but breaks damp/lerp animations.
        // Keep "always" but reduce DPR above to compensate.
        frameloop="always"
        style={{ pointerEvents: "none" }}
      >
        <SceneContent isMobile={isMobile} />
      </Canvas>
    </div>
  );
}