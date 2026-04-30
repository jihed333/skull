"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { KnightModel } from "./KnightModel";

const CAMERA = { fov: 45, z: 5 } as const;
const HALF_FOV_RAD = (CAMERA.fov / 2) * (Math.PI / 180);

function getSkullConfig(isMobile: boolean) {
  return {
    offset: isMobile ? [0.12, 0.48, -1.85] as [number, number, number] : [0.20, 0.50, -1.75],
    rotation: [0.70, 0.43, -0.42] as [number, number, number],
    scale: isMobile ? 0.93 : 0.97,
  };
}

function getTravelConfig(isMobile: boolean) {
  return {
    targetScreenX: 0.5,
    targetScreenY: isMobile ? 1.68 : 1.5,
    scaleRatio: 0.78,
  };
}

const SCROLL_PIXELS_FOR_FULL = 680;

function screenToWorld(px: number, py: number, vw: number, vh: number, objZ = 0): [number, number] {
  const dist = CAMERA.z - objZ;
  const halfH = dist * Math.tan(HALF_FOV_RAD);
  const halfW = halfH * (vw / vh);
  const wx = ((px / vw) * 2 - 1) * halfW;
  const wy = -((py / vh) * 2 - 1) * halfH;
  return [wx, wy];
}

// Skull Mesh - Heavily optimized for mobile
function SkullMesh({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.Material | null>(null);

  const { scene } = useGLTF("/models/skull_clean.glb");

  const material = useMemo(() => {
    if (isMobile) {
      return new THREE.MeshStandardMaterial({
        color: 0x050505,
        metalness: 1.0,
        roughness: 0.14,
        envMapIntensity: 1.9,
        transparent: true,
      });
    } else {
      return new THREE.MeshPhysicalMaterial({
        color: 0x050505,
        metalness: 1.0,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.5,
        transparent: true,
      });
    }
  }, [isMobile]);

  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [scene, material]);

  const state = useRef({
    posX: 0, posY: 0, posZ: -1.8,
    rotX: 0.70, rotY: 0.43, rotZ: -0.42,
    scale: 1,
    opacity: 1,
    scrollYAtDetach: -1,
    isDetached: false,
    scrollProgress: 0,
  });

  const frameRectRef = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef(0);
  const viewportRef = useRef({ w: 1024, h: 700 });

  // Update viewport (stable)
  useEffect(() => {
    const updateViewport = () => {
      viewportRef.current = {
        w: window.innerWidth,
        h: Math.max(window.innerHeight, 560),
      };
    };
    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Update rects (throttled)
  useEffect(() => {
    let raf: number | null = null;

    const updateRects = () => {
      const frame = document.querySelector("[data-portrait-frame]") as HTMLElement;
      const scanline = document.querySelector("[data-portrait-scanline]") as HTMLElement;

      if (frame) frameRectRef.current = frame.getBoundingClientRect();
      if (scanline) scanlineTopRef.current = scanline.getBoundingClientRect().top;
    };

    const throttled = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRects);
    };

    window.addEventListener("scroll", throttled, { passive: true });
    const ro = new ResizeObserver(throttled);
    const frameEl = document.querySelector("[data-portrait-frame]");
    if (frameEl) ro.observe(frameEl);

    updateRects();

    return () => {
      window.removeEventListener("scroll", throttled);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !frameRectRef.current) return;

    const SKULL = getSkullConfig(isMobile);
    const TRAVEL = getTravelConfig(isMobile);
    const vp = viewportRef.current;
    const frameRect = frameRectRef.current!;
    const slTop = scanlineTopRef.current;

    const s = state.current;

    const distToBottom = frameRect.bottom - slTop;
    const triggerZone = frameRect.height * 0.18;
    const scanlineComplete = slTop >= frameRect.bottom - 4;

    const [frameWorldX, frameWorldY] = screenToWorld(
      frameRect.left + frameRect.width / 2,
      frameRect.top + frameRect.height / 2,
      vp.w, vp.h, SKULL.offset[2]
    );

    const liveAnchorX = frameWorldX + SKULL.offset[0];
    const liveAnchorY = frameWorldY + SKULL.offset[1];

    if (!scanlineComplete && !s.isDetached) {
      // LOCKED PHASE
      s.posX = liveAnchorX;
      s.posY = liveAnchorY;
      s.posZ = SKULL.offset[2];
      s.scale = SKULL.scale;
      s.opacity = 1;

      const pTurn = gsap.parseEase("power2.inOut")(THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1));
      const stare = [0.55, 0.05, 0] as const;

      s.rotX = THREE.MathUtils.lerp(SKULL.rotation[0], stare[0], pTurn);
      s.rotY = THREE.MathUtils.lerp(SKULL.rotation[1], stare[1], pTurn);
      s.rotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stare[2], pTurn);
    } else {
      // DETACHED PHASE
      if (!s.isDetached) {
        s.scrollYAtDetach = window.scrollY;
        s.isDetached = true;
      }

      const pixels = window.scrollY - s.scrollYAtDetach;
      const rawP = THREE.MathUtils.clamp(pixels / SCROLL_PIXELS_FOR_FULL, 0, 1);
      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawP, 6.0, delta);

      const p = s.scrollProgress;

      s.rotX = 0.55;
      s.rotY = 0.05;
      s.rotZ = 0;

      // Scale animation
      let currentScale = SKULL.scale;
      let currentZ = SKULL.offset[2];

      if (p < 0.33) {
        const t = gsap.parseEase("power2.out")(p / 0.33);
        currentScale = THREE.MathUtils.lerp(SKULL.scale, 2.65, t);
        currentZ = THREE.MathUtils.lerp(SKULL.offset[2], 1.15, t);
      } else {
        const t = gsap.parseEase("power3.inOut")((p - 0.33) / 0.67);
        currentScale = THREE.MathUtils.lerp(2.65, TRAVEL.scaleRatio, t);
        currentZ = THREE.MathUtils.lerp(1.15, SKULL.offset[2], t);
      }

      s.scale = currentScale;
      s.posZ = currentZ;

      // Position travel
      const [destX, destY] = screenToWorld(
        vp.w * TRAVEL.targetScreenX,
        vp.h * TRAVEL.targetScreenY,
        vp.w, vp.h, SKULL.offset[2]
      );

      const breakoutX = THREE.MathUtils.lerp(liveAnchorX, frameWorldX, gsap.parseEase("power2.out")(Math.min(p * 2, 1)));
      s.posX = THREE.MathUtils.lerp(breakoutX, destX, gsap.parseEase("power3.inOut")(Math.max(0, (p - 0.25) / 0.75)));
      s.posY = THREE.MathUtils.lerp(liveAnchorY, destY, gsap.parseEase("power3.inOut")(Math.max(0, (p - 0.25) / 0.75)));

      // Fade
      s.opacity = p > 0.75 ? THREE.MathUtils.lerp(1, 0, (p - 0.75) / 0.25) : 1;
    }

    // Apply transforms
    group.position.set(s.posX, s.posY, s.posZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.scale);

    if (material.transparent) {
      (material as any).opacity = s.opacity;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={skull} />
    </group>
  );
}

// Scene Content
function SceneContent({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.15} color="#1a1a2e" />
      <directionalLight position={[5, 4, 4]} intensity={2.2} color="#f5f0eb" />
      <directionalLight position={[-4, 3, -3]} intensity={1.6} color="#ffb8a0" />
      <pointLight position={[-2, 3, 3]} intensity={1.1} color="#ffffff" distance={18} />

      <SkullMesh isMobile={isMobile} />
      <KnightModel visible={true} isMobile={isMobile} />
    </>
  );
}

// Main Export
export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null!);

  // Clip Path Control
  useEffect(() => {
    let raf: number;
    const updateClip = () => {
      const container = containerRef.current;
      const scanline = document.querySelector("[data-portrait-scanline]");
      const frame = document.querySelector("[data-portrait-frame]");

      if (container && scanline && frame) {
        const slRect = scanline.getBoundingClientRect();
        const fRect = frame.getBoundingClientRect();

        if (slRect.top >= fRect.bottom - 5) {
          container.style.clipPath = "inset(0px 0px 0px 0px)";
        } else {
          const clipBottom = window.innerHeight - slRect.top + 10;
          container.style.clipPath = `inset(0px 0px ${clipBottom}px 0px)`;
        }
      }
      raf = requestAnimationFrame(updateClip);
    };

    raf = requestAnimationFrame(updateClip);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        dpr={isMobile ? [1, 1.4] : [1, 2]}
        style={{ pointerEvents: "none" }}
      >
        <SceneContent isMobile={isMobile} />
      </Canvas>
    </div>
  );
}