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

// ─── Responsive skull config ─────────────────────────────────────────────────
function getSkullConfig() {
  return {
    offset: [0.20, 0.50, -1.75] as [number, number, number],
    rotation: [0.70, 0.43, -0.42] as [number, number, number],
    scale: 0.97,
  };
}

// ─── Materials ───────────────────────────────────────────────────────────────
// Desktop: expensive MeshPhysicalMaterial with clearcoat reflections
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

// Mobile: lighter MeshStandardMaterial — no clearcoat shader pass
const SKULL_MATERIAL_MOBILE = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x080808),
  metalness: 1.0,
  roughness: 0.18,
  envMapIntensity: 1.2,
  transparent: true,
});

// ─── Light presets ───────────────────────────────────────────────────────────
const LIGHTS_DESKTOP = [
  { type: "dir", position: [5, 3, 4], intensity: 2.5, color: "#f5f0eb" },
  { type: "dir", position: [-4, 2, -3], intensity: 1.8, color: "#ffb8a0" },
  { type: "point", position: [-2, 3, 3], intensity: 1.2, color: "#ffffff", distance: 15 },
  { type: "ambient", intensity: 0.1, color: "#1a1a2e" },
] as const;

// Mobile: only 2 lights instead of 4 — saves GPU fragment shader passes
const LIGHTS_MOBILE = [
  { type: "dir", position: [5, 3, 4], intensity: 2.2, color: "#f5f0eb" },
  { type: "ambient", intensity: 0.25, color: "#1a1a2e" },
] as const;

// ─── Responsive travel config ────────────────────────────────────────────────
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

function screenToWorld(px: number, py: number, objZ: number = 0): [number, number] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dist = CAMERA.z - objZ;
  const halfH = dist * Math.tan(HALF_FOV_RAD);
  const halfW = halfH * (vw / vh);
  const wx = ((px / vw) * 2 - 1) * halfW;
  const wy = -((py / vh) * 2 - 1) * halfH;
  return [wx, wy];
}

function elementCenterToWorld(rect: DOMRect, objZ: number = 0): [number, number] {
  return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, objZ);
}

// ─── Skull Mesh ──────────────────────────────────────────────────────────────
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
        child.castShadow = !isMobile; // shadows are expensive on mobile
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
    scrollProgress: 0,
    scrollYAtDetach: -1,
    isDetached: false,
  });

  // Cache rects — getBoundingClientRect inside useFrame forced a full
  // layout recalculation 60×/sec which was the #1 cause of skull jitter.
  const frameRectRef = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef<number>(0);

  useEffect(() => {
    const updateRects = () => {
      const frame = document.querySelector("[data-portrait-frame]");
      const scanline = document.querySelector("[data-portrait-scanline]");
      if (frame) frameRectRef.current = frame.getBoundingClientRect();
      if (scanline) scanlineTopRef.current = scanline.getBoundingClientRect().top;
    };
    window.addEventListener("scroll", updateRects, { passive: true });
    const ro = new ResizeObserver(updateRects);
    const frame = document.querySelector("[data-portrait-frame]");
    if (frame) ro.observe(frame);
    updateRects();
    return () => {
      window.removeEventListener("scroll", updateRects);
      ro.disconnect();
    };
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const SKULL = getSkullConfig();
    const TRAVEL = getTravelConfig();

    const frameRect = frameRectRef.current;
    if (!frameRect) return;

    const s = state.current;
    const slTop = scanlineTopRef.current;

    // ── Scanline completion check (using cached rects) ─────────────────────
    let scanlineComplete = s.isDetached;
    let scanlineEndProgress = 0;

    const distToBottom = frameRect.bottom - slTop;
    const triggerZone = frameRect.height * 0.15;
    scanlineEndProgress = THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1);

    if (!s.isDetached && slTop >= frameRect.bottom - 2) {
      scanlineComplete = true;
    }
    if (s.isDetached && slTop < frameRect.bottom - 20) {
      scanlineComplete = false;
    }

    // ── Live anchor in frame ───────────────────────────────────────────────
    const [frameWorldX, frameWorldY] = elementCenterToWorld(frameRect, SKULL.offset[2]);
    const liveAnchorX = frameWorldX + SKULL.offset[0];
    const liveAnchorY = frameWorldY + SKULL.offset[1];

    if (!scanlineComplete) {
      // ══ PHASE 1: LOCKED ══════════════════════════════════════════════════
      s.posX = liveAnchorX;
      s.posY = liveAnchorY;
      s.posZ = SKULL.offset[2];

      const pInitialTurn = easeRotate(scanlineEndProgress);
      const stareRot = [0.55, 0.05, 0.0] as const;

      s.rotX = THREE.MathUtils.lerp(SKULL.rotation[0], stareRot[0], pInitialTurn);
      s.rotY = THREE.MathUtils.lerp(SKULL.rotation[1], stareRot[1], pInitialTurn);
      s.rotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stareRot[2], pInitialTurn);

      s.scale = SKULL.scale;
      s.opacity = 1;
      s.scrollProgress = 0;
      s.scrollYAtDetach = -1;
      s.isDetached = false;

    } else {
      // ══ PHASES 2–4: DETACHED (rotate → travel → rest) ═══════════════════

      if (!s.isDetached) {
        s.scrollYAtDetach = window.scrollY;
        s.isDetached = true;
      }

      const pixelsScrolled = window.scrollY - s.scrollYAtDetach;
      const rawProgress = THREE.MathUtils.clamp(pixelsScrolled / SCROLL_PIXELS_FOR_FULL, 0, 1);

      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawProgress, 4.0, delta);
      const p = s.scrollProgress;

      const stareRot = [0.55, 0.05, 0.0] as const;
      s.rotX = stareRot[0];
      s.rotY = stareRot[1];
      s.rotZ = stareRot[2];

      // ── Scale pop ───────────────
      const maxPopScale = 2.8;

      const pPop = THREE.MathUtils.clamp(p / 0.3, 0, 1);
      const pTravel = THREE.MathUtils.clamp(p / 1.0, 0, 1);

      let currentScale = SKULL.scale;
      let currentZ = SKULL.offset[2];
      const zPunch = 1.2;

      if (p < 0.3) {
        currentScale = THREE.MathUtils.lerp(SKULL.scale, maxPopScale, easeRotate(pPop));
        currentZ = THREE.MathUtils.lerp(SKULL.offset[2], zPunch, easeRotate(pPop));
      } else {
        const pTravelScale = THREE.MathUtils.clamp((p - 0.3) / 0.7, 0, 1);
        currentScale = THREE.MathUtils.lerp(maxPopScale, TRAVEL.scaleRatio, easeTravel(pTravelScale));
        currentZ = THREE.MathUtils.lerp(zPunch, SKULL.offset[2], easeTravel(pTravelScale));
      }

      s.scale = currentScale;
      s.posZ = currentZ;

      // ── XY: travel to below viewport ────────────────────────────────────
      const [destX, destY] = screenToWorld(
        window.innerWidth * TRAVEL.targetScreenX,
        window.innerHeight * 1.5,
        SKULL.offset[2]
      );

      const breakoutAnchorX = THREE.MathUtils.lerp(liveAnchorX, frameWorldX, easeRotate(pPop));
      s.posX = THREE.MathUtils.lerp(breakoutAnchorX, destX, easeTravel(pTravel));
      s.posY = THREE.MathUtils.lerp(liveAnchorY, destY, easeTravel(pTravel));

      // Fade out in the last 25%
      const fadeStart = 0.75;
      const fadeP = THREE.MathUtils.clamp((pTravel - fadeStart) / (1 - fadeStart), 0, 1);
      s.opacity = 1 - easeTravel(fadeP);
    }

    group.position.set(s.posX, s.posY, s.posZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.scale);

    material.opacity = s.opacity;
  });

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>}>
      <primitive object={skull} />
    </group>
  );
}

// ─── Scene content (inside Canvas — has access to R3F + React contexts) ──────
function SceneContent({ isMobile }: { isMobile: boolean }) {
  const { scrollProgress } = useScrollContext();
  const lights = isMobile ? LIGHTS_MOBILE : LIGHTS_DESKTOP;

  return (
    <>
      {/* Desktop: full HDR environment for realistic reflections.
          Mobile: skip it — saves ~2 MB download + heavy GPU convolution. */}
      {!isMobile && <Environment preset="night" />}

      {lights.map((l, i) =>
        l.type === "dir" ? (
          <directionalLight key={i} position={l.position as any} intensity={l.intensity} color={l.color} />
        ) : l.type === "point" ? (
          <pointLight key={i} position={l.position as any} intensity={l.intensity} distance={(l as any).distance} />
        ) : (
          <ambientLight key={i} intensity={l.intensity} />
        )
      )}

      <SkullMesh isMobile={isMobile} />

      {/* Knight: same model that was in Scene.tsx, now sharing this WebGL context */}
      <KnightModel visible={scrollProgress >= 0.35} isMobile={isMobile} />
    </>
  );
}

// ─── Exported canvas ─────────────────────────────────────────────────────────
export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Clip-path animation — reveals the skull behind the scanline.
  // On mobile, throttle to ~30 fps to reduce layout-read overhead.
  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const MOBILE_FRAME_MS = 33; // ~30 fps

    const updateClipPath = (time: number) => {
      // Throttle on mobile
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
          const bottomClip = window.innerHeight - slRect.top;
          container.style.clipPath = `inset(0px 0px ${bottomClip}px 0px)`;
        }
      }
      rafId = requestAnimationFrame(updateClipPath);
    };

    rafId = requestAnimationFrame(updateClipPath);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile]);

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
        }}
        dpr={isMobile ? [0.5, 1] : [1, 2]}
        style={{ pointerEvents: "none" }}
      >
        <SceneContent isMobile={isMobile} />
      </Canvas>
    </div>
  );
}