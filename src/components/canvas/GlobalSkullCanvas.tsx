"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { KnightModel } from "./KnightModel";
import { scanlineState } from "../canvas/scanlineState";

const CAM_FOV = 45;
const CAM_Z = 5;
const HALF_FOV = (CAM_FOV / 2) * (Math.PI / 180);
const SCROLL_PIXELS_FOR_FULL = 680;

// ── Shared camera params (computed once) ──────────────────────────────────────
const _v2 = new THREE.Vector2();

interface SkullConfig { offset: [number, number, number]; rotation: [number, number, number]; scale: number; }
interface TravelConfig { targetScreenX: number; targetScreenY: number; scaleRatio: number; }

function getSkullConfig(isMobile: boolean): SkullConfig {
  return {
    offset: isMobile ? [0.19, 0.48, -1.85] : [0.20, 0.50, -1.75],
    rotation: [0.70, 0.43, -0.42],
    scale: isMobile ? 1.04 : 0.97,
  };
}
function getTravelConfig(isMobile: boolean): TravelConfig {
  return { targetScreenX: 0.5, targetScreenY: isMobile ? 1.68 : 1.5, scaleRatio: 0.78 };
}

function screenToWorld(px: number, py: number, vw: number, vh: number, objZ = 0): [number, number] {
  const dist = CAM_Z - objZ, halfH = dist * Math.tan(HALF_FOV), halfW = halfH * (vw / vh);
  return [((px / vw) * 2 - 1) * halfW, -((py / vh) * 2 - 1) * halfH];
}

interface SkullState {
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number;
  scale: number; opacity: number;
  scrollYAtDetach: number; isDetached: boolean; scrollProgress: number;
}

function SkullMesh({ isMobile, scrollYRef }: { isMobile: boolean; scrollYRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF("/models/skull_clean.glb");

  // MeshPhysical is correct here for the obsidian-chrome look — single instance, no DC penalty
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 1.0,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.5,
    transparent: true,
  }), []);
  const materialRef = useRef(material);
  materialRef.current = material;

  const skull = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = material;
        // No shadow map passes → saves 1 DC per mesh
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        // Model moves across viewport — frustum culling would pop it; keep disabled
        mesh.frustumCulled = false;
      }
    });
    return clone;
  }, [scene, material]);

  useEffect(() => () => material.dispose(), [material]);

  const state = useRef<SkullState>({
    posX: 0, posY: 0, posZ: -1.8, rotX: 0.70, rotY: 0.43, rotZ: -0.42,
    scale: 1, opacity: 1, scrollYAtDetach: -1, isDetached: false, scrollProgress: 0,
  });

  const frameRectRef = useRef<DOMRect | null>(null);
  const scanlineTopRef = useRef(0);
  const { size } = useThree();

  useEffect(() => {
    let pending: number | null = null;
    const measure = () => {
      const frameEl = document.querySelector<HTMLElement>("[data-portrait-frame]");
      const nextRect = frameEl ? frameEl.getBoundingClientRect() : null;
      if (nextRect) frameRectRef.current = nextRect;
      pending = null;
    };
    const schedule = () => { if (pending) return; pending = requestAnimationFrame(measure); };
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

  useEffect(() => {
    const sync = () => { scanlineTopRef.current = scanlineState.scanY; };
    gsap.ticker.add(sync);
    return () => gsap.ticker.remove(sync);
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !frameRectRef.current) return;

    const SKULL = getSkullConfig(isMobile);
    const TRAVEL = getTravelConfig(isMobile);
    const rect = frameRectRef.current;
    const s = state.current;
    const currentScrollY = scrollYRef.current;
    const vp = { w: size.width, h: size.height };

    const [frameWX, frameWY] = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, vp.w, vp.h, SKULL.offset[2]);
    const anchorX = frameWX + SKULL.offset[0];
    const anchorY = frameWY + SKULL.offset[1];

    const triggerZone = rect.height * 0.18;
    const scanlineScreenY = rect.top + scanlineState.scanY;
    const distToBottom = rect.bottom - scanlineScreenY;
    const scanlineComplete = scanlineScreenY >= rect.bottom - 4;

    if (s.isDetached && currentScrollY < s.scrollYAtDetach && s.scrollProgress < 0.05) {
      s.isDetached = false; s.scrollProgress = 0;
    }

    if (!scanlineComplete && !s.isDetached) {
      s.posX = anchorX; s.posY = anchorY; s.posZ = SKULL.offset[2];
      s.scale = SKULL.scale; s.opacity = 1;
      const tTurn = gsap.parseEase("power2.inOut")(THREE.MathUtils.clamp(1 - distToBottom / triggerZone, 0, 1));
      const stare: [number, number, number] = [0.55, 0.05, 0];
      s.rotX = THREE.MathUtils.lerp(SKULL.rotation[0], stare[0], tTurn);
      s.rotY = THREE.MathUtils.lerp(SKULL.rotation[1], stare[1], tTurn);
      s.rotZ = THREE.MathUtils.lerp(SKULL.rotation[2], stare[2], tTurn);
    } else {
      if (!s.isDetached) { s.scrollYAtDetach = currentScrollY; s.isDetached = true; }
      const pixels = currentScrollY - s.scrollYAtDetach;
      const rawP = THREE.MathUtils.clamp(pixels / SCROLL_PIXELS_FOR_FULL, 0, 1);
      s.scrollProgress = THREE.MathUtils.damp(s.scrollProgress, rawP, 6.0, delta);
      const p = s.scrollProgress;
      const stare: [number, number, number] = [0.55, 0.05, 0];
      const travelRot: [number, number, number] = [0.45, 0.0, 0];
      const rotP = THREE.MathUtils.clamp(p * 3, 0, 1);
      s.rotX = THREE.MathUtils.lerp(stare[0], travelRot[0], rotP);
      s.rotY = THREE.MathUtils.lerp(stare[1], travelRot[1], rotP);
      s.rotZ = THREE.MathUtils.lerp(stare[2], travelRot[2], rotP);
      if (p < 0.33) {
        const t = gsap.parseEase("power2.out")(p / 0.33);
        s.scale = THREE.MathUtils.lerp(SKULL.scale, 1.6, t);
        s.posZ = THREE.MathUtils.lerp(SKULL.offset[2], -0.2, t);
      } else {
        const t = gsap.parseEase("power3.inOut")((p - 0.33) / 0.67);
        s.scale = THREE.MathUtils.lerp(1.6, TRAVEL.scaleRatio, t);
        s.posZ = THREE.MathUtils.lerp(-0.2, SKULL.offset[2], t);
      }
      const [destX, destY] = screenToWorld(vp.w * TRAVEL.targetScreenX, vp.h * TRAVEL.targetScreenY, vp.w, vp.h, SKULL.offset[2]);
      const breakoutEase = gsap.parseEase("power2.out");
      const travelEase = gsap.parseEase("power3.inOut");
      const breakoutX = THREE.MathUtils.lerp(anchorX, frameWX, breakoutEase(Math.min(p * 2, 1)));
      s.posX = THREE.MathUtils.lerp(breakoutX, destX, travelEase(Math.max(0, (p - 0.25) / 0.75)));
      s.posY = THREE.MathUtils.lerp(anchorY, destY, travelEase(Math.max(0, (p - 0.25) / 0.75)));
      s.opacity = 1;
    }

    group.position.set(s.posX, s.posY, s.posZ);
    group.rotation.set(s.rotX, s.rotY, s.rotZ);
    group.scale.setScalar(s.scale);
    if (materialRef.current.transparent) materialRef.current.opacity = s.opacity;
  });

  return <group ref={groupRef}><primitive object={skull} /></group>;
}

// frames={1} → env map rendered once and baked; no per-frame overhead
// resolution={128} → tiny VRAM footprint, plenty for reflections on black metal
function Lighting() {
  return (
    <>
      <Environment preset="night" frames={1} resolution={128} />
      <ambientLight intensity={0.1} color="#1a1a3a" />
      <directionalLight position={[5, 4, 4]} intensity={0.8} color="#a0b0ff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#ffb8a0" />
      <pointLight position={[-2, 3, 3]} intensity={0.4} color="#ffffff" distance={20} />
    </>
  );
}

function SceneContent({ isMobile, scrollYRef }: { isMobile: boolean; scrollYRef: React.MutableRefObject<number> }) {
  const [hasScrolled, setHasScrolled] = React.useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
        window.removeEventListener("scroll", checkScroll);
      }
    };
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <>
      <Lighting />
      <SkullMesh isMobile={isMobile} scrollYRef={scrollYRef} />
      {hasScrolled && <KnightModel visible={true} isMobile={isMobile} />}
    </>
  );
}

export function GlobalSkullCanvas({ isMobile = false }: { isMobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const scrollYRef = useRef(0);

  useEffect(() => {
    scrollYRef.current = window.scrollY;
    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, []);

  useEffect(() => {
    let frameRectBottom = 0;
    let frameRectTop = 0;
    let containerH = 0;
    let measurePending: number | null = null;
    let lastClip = "";

    const measure = () => {
      const frame = document.querySelector("[data-portrait-frame]");
      const container = containerRef.current;
      if (!frame || !container) return;
      const fRect = frame.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      frameRectBottom = fRect.bottom;
      frameRectTop = fRect.top;
      containerH = cRect.height;
      measurePending = null;
    };
    const scheduleMeasure = () => {
      if (measurePending) return;
      measurePending = requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("touchmove", scheduleMeasure, { passive: true });
    const ro = new ResizeObserver(scheduleMeasure);
    const frameEl = document.querySelector("[data-portrait-frame]");
    if (frameEl) ro.observe(frameEl);

    const tick = () => {
      const container = containerRef.current;
      if (!container) return;
      const scanlineViewportY = frameRectTop + scanlineState.scanY;
      let nextClip: string;
      if (frameRectBottom < 0 || scanlineViewportY >= frameRectBottom - 5) {
        nextClip = "inset(0px 0px 0px 0px)";
      } else {
        const clipBottom = Math.max(0, containerH - scanlineViewportY + 10);
        nextClip = `inset(0px 0px ${clipBottom}px 0px)`;
      }
      if (nextClip !== lastClip) {
        container.style.clipPath = nextClip;
        lastClip = nextClip;
      }
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("touchmove", scheduleMeasure);
      ro.disconnect();
      if (measurePending) cancelAnimationFrame(measurePending);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[50]"
      style={{
        height: "100svh",
        clipPath: "inset(0px 0px 100% 0px)",
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
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          // Disable stencil + depth write outside what Three needs → GPU memory win
          stencil: false,
        }}
        dpr={isMobile ? 1 : [1, 1.5]}   // cap at 1.5 instead of 2 — imperceptible diff, 44% fewer pixels on retina
        style={{ pointerEvents: "none" }}
        resize={{ debounce: { scroll: 50, resize: 0 } }}
        frameloop="always"
      >
        <SceneContent isMobile={isMobile} scrollYRef={scrollYRef} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/skull_clean.glb");