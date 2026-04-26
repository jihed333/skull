"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

const CAMERA = { fov: 45, z: 5 } as const;
const HALF_FOV_RAD = (CAMERA.fov / 2) * (Math.PI / 180);

// ─── Responsive skull config ─────────────────────────────────────────────────
function getSkullConfig() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return {
    offset: isMobile
      ? ([0.10, 0.45, -1.75] as [number, number, number])
      : ([0.18, 0.55, -1.75] as [number, number, number]),
    rotation: isMobile
      ? ([0.70, 0.30, -0.30] as [number, number, number])
      : ([0.70, 0.43, -0.42] as [number, number, number]),
    scale: isMobile ? 0.85 : 1.08,
  };
}

const SKULL_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0x050505),
  metalness: 1.0,
  roughness: 0.08,
  reflectivity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  envMapIntensity: 2.5,
  transparent: true,
});

const LIGHTS = [
  { type: "dir", position: [5, 3, 4], intensity: 2.5, color: "#f5f0eb" },
  { type: "dir", position: [-4, 2, -3], intensity: 1.8, color: "#ffb8a0" },
  { type: "point", position: [-2, 3, 3], intensity: 1.2, color: "#ffffff", distance: 15 },
  { type: "ambient", intensity: 0.1, color: "#1a1a2e" },
] as const;

// ─── Responsive travel config ────────────────────────────────────────────────
function getTravelConfig() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return {
    targetScreenX: 0.5,
    targetScreenY: isMobile ? 0.40 : 0.35,
    scaleRatio: isMobile ? 0.6 : 0.8,
    yawDelta: -0.45,
    pitchDelta: -0.05,
  };
}

// scrollPixelsForFull: how many px you need to scroll after detach to reach p=1
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

function SkullMesh() {
  const groupRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF(
    "/models/skull_clean.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.5/"
  );

  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = SKULL_MATERIAL;
        child.castShadow = true;
      }
    });
    return clone;
  }, [scene]);

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

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Recalculate responsive config every frame (cheap)
    const SKULL = getSkullConfig();
    const TRAVEL = getTravelConfig();

    const frame = document.querySelector("[data-portrait-frame]");
    const scanline = document.querySelector("[data-portrait-scanline]");
    const aboutSection = document.querySelector("#about");
    if (!frame || !aboutSection) return;

    const frameRect = frame.getBoundingClientRect();
    const s = state.current;

    // ── Scanline completion check ──────────────────────────────────────────
    let scanlineComplete = s.isDetached;
    let scanlineEndProgress = 0;

    if (scanline) {
      const slRect = scanline.getBoundingClientRect();
      const distToBottom = frameRect.bottom - slRect.top;
      const triggerZone = frameRect.height * 0.15;
      scanlineEndProgress = THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1);

      if (!s.isDetached && slRect.top >= frameRect.bottom - 2) {
        scanlineComplete = true;
      }
      if (s.isDetached && slRect.top < frameRect.bottom - 20) {
        scanlineComplete = false;
      }
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

      // ── Scale pop — reduced on mobile to prevent overflow ───────────────
      const isMobile = window.innerWidth < 768;
      const maxPopScale = isMobile ? 1.8 : 2.8;

      const pPop    = THREE.MathUtils.clamp(p / 0.3, 0, 1);
      const pTravel = THREE.MathUtils.clamp(p / 1.0, 0, 1);

      let currentScale = THREE.MathUtils.lerp(SKULL.scale, maxPopScale, easeRotate(pPop));
      currentScale     = THREE.MathUtils.lerp(currentScale, TRAVEL.scaleRatio, easeTravel(pTravel));
      s.scale = currentScale;

      // ── Z: punch forward, snap back ────────────────────────────────────
      const zPunch = isMobile ? 0.6 : 1.2;
      let currentZ = THREE.MathUtils.lerp(SKULL.offset[2], zPunch, easeRotate(pPop));
      currentZ     = THREE.MathUtils.lerp(currentZ, SKULL.offset[2], easeTravel(pTravel));
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

    SKULL_MATERIAL.opacity = s.opacity;
  });

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>}>
      <primitive object={skull} />
    </group>
  );
}

export function GlobalSkullCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const updateClipPath = () => {
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
  }, []);

  // Lower DPR on mobile for performance
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[50]"
      style={{ clipPath: "inset(0px 0px 100% 0px)" }}
    >
      <Canvas
        camera={{ position: [0, 0, CAMERA.z], fov: CAMERA.fov }}
        gl={{ alpha: true, antialias: !isMobile }}
        dpr={isMobile ? [1, 1] : [1, 2]}
        style={{ pointerEvents: "none" }}
      >
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
        <SkullMesh />
      </Canvas>
    </div>
  );
}