"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONFIGURATION: ANATOMICAL ALIGNMENT (PIXEL-PERFECT)
 * ═══════════════════════════════════════════════════════════════════════
 * These values are calibrated to the 2026 "ARCHITECT" frame.
 * Offset Y is boosted to 0.92 to ensure the skull base meets the C1 vertebra.
 * ═══════════════════════════════════════════════════════════════════════
 */
const CAMERA = { fov: 45, z: 5 } as const;
const HALF_FOV_RAD = (CAMERA.fov / 2) * (Math.PI / 180);
const VIS_HALF_H = CAMERA.z * Math.tan(HALF_FOV_RAD);

const SKULL_CONFIG = {
  // Precision alignment relative to the portrait-frame center
  offset: [0.24, 0.50, -1.75] as [number, number, number],
  // Matches the 3/4 tilt in your reference screenshot
  rotation: [0.70, 0.43, -0.42] as [number, number, number],
  scale: 1.08, 
} as const;

const SKULL_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0x050505),
  metalness: 1.0,
  roughness: 0.08,
  reflectivity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  envMapIntensity: 2.5,
});

const LIGHTS = [
  { type: "dir", position: [5, 3, 4], intensity: 2.5, color: "#f5f0eb" },
  { type: "dir", position: [-4, 2, -3], intensity: 1.8, color: "#ffb8a0" },
  { type: "point", position: [-2, 3, 3], intensity: 1.2, color: "#ffffff", distance: 15 },
  { type: "ambient", intensity: 0.1, color: "#1a1a2e" },
] as const;

const TRAVEL = {
  targetScreenX: 0.22,
  targetScreenY: 0.38,
  scaleRatio: 0.82,
  arcHeight: 0.35,
  yawDelta: 0.35,
  pitchDelta: -0.05,
  detachDuration: 0.7,
  idleThreshold: 0.98,
} as const;

const IDLE = {
  yawAmp: 0.02, yawFreq: 0.8,
  pitchAmp: 0.01, pitchFreq: 0.6,
  breathAmp: 0.004, breathFreq: 1.2,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function screenToWorld(px: number, py: number): [number, number] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const halfW = VIS_HALF_H * (vw / vh);
  const wx = ((px / vw) * 2 - 1) * halfW;
  const wy = -((py / vh) * 2 - 1) * VIS_HALF_H;
  return [wx, wy];
}

function elementCenterToWorld(el: HTMLElement): [number, number] {
  const r = el.getBoundingClientRect();
  return screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
}

// ─── Component: SkullMesh ───────────────────────────────────────────────────

interface IdleState {
  active: boolean;
  time: number;
  baseYaw: number;
  basePitch: number;
  baseScale: number;
}

function SkullMesh({ groupRef, idleRef }: { groupRef: React.RefObject<THREE.Group | null>, idleRef: React.RefObject<IdleState> }) {
  const { scene } = useGLTF("/models/skull.glb");

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

  useFrame((_, delta) => {
    const group = groupRef.current;
    const idle = idleRef.current;
    if (!group || !idle || !idle.active) return;

    idle.time += delta;
    group.rotation.y = idle.baseYaw + Math.sin(idle.time * IDLE.yawFreq) * IDLE.yawAmp;
    group.rotation.x = idle.basePitch + Math.cos(idle.time * IDLE.pitchFreq) * IDLE.pitchAmp;
    group.scale.setScalar(idle.baseScale * (1 + Math.sin(idle.time * IDLE.breathFreq) * IDLE.breathAmp));
  });

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>}>
      <primitive object={skull} />
    </group>
  );
}

// ─── Component: GlobalSkullCanvas ───────────────────────────────────────────

export function GlobalSkullCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);
  const idleRef = useRef<IdleState>({ active: false, time: 0, baseYaw: 0, basePitch: 0, baseScale: 1 });
  const frameCenterRef = useRef({ cx: 0, cy: 0 });

  useEffect(() => {
    const portrait = document.querySelector("[data-portrait-section]") as HTMLElement;
    const frame = document.querySelector("[data-portrait-frame]") as HTMLElement;
    const contact = document.querySelector("#contact") as HTMLElement;
    if (!portrait || !frame || !contact) return;

    const resetToHome = () => {
      const group = groupRef.current;
      if (!group) return;
      const [cx, cy] = elementCenterToWorld(frame);
      frameCenterRef.current = { cx, cy };
      group.position.set(cx + SKULL_CONFIG.offset[0], cy + SKULL_CONFIG.offset[1], SKULL_CONFIG.offset[2]);
      group.rotation.set(SKULL_CONFIG.rotation[0], SKULL_CONFIG.rotation[1], SKULL_CONFIG.rotation[2]);
      group.scale.setScalar(SKULL_CONFIG.scale);
      group.updateMatrix();
    };

    // Immediate initial sync
    setTimeout(resetToHome, 100);

    // Phase 1: Scanline Reveal Sync
    const reveal = ScrollTrigger.create({
      trigger: portrait,
      start: "top top",
      end: "+=150%",
      scrub: true,
      onUpdate: (self) => {
        const rect = frame.getBoundingClientRect();
        const top = rect.top;
        const left = rect.left;
        const right = window.innerWidth - rect.right;
        const bottom = window.innerHeight - rect.top - rect.height * self.progress;
        if (containerRef.current) {
          containerRef.current.style.clipPath = `inset(${top}px ${right}px ${Math.max(0, bottom)}px ${left}px)`;
        }
        resetToHome();
      },
      onLeave: () => {
        gsap.to(containerRef.current, {
          clipPath: "inset(0px 0px 0px 0px)",
          duration: TRAVEL.detachDuration,
          ease: "power3.inOut"
        });
      },
      onEnterBack: () => {
        idleRef.current.active = false;
      }
    });

    // Phase 2: Anatomical Travel to Contact Section
    const travel = ScrollTrigger.create({
      trigger: contact,
      start: "top 100%",
      end: "top 35%",
      scrub: 1.2,
      onUpdate: (self) => {
        const group = groupRef.current;
        if (!group) return;

        const [startX, startY] = elementCenterToWorld(frame);
        const contactRect = contact.getBoundingClientRect();
        const [endX, endY] = screenToWorld(
          window.innerWidth * TRAVEL.targetScreenX,
          contactRect.top + contactRect.height * TRAVEL.targetScreenY
        );

        const ease = gsap.parseEase("expo.inOut")(self.progress);
        
        group.position.x = (startX + SKULL_CONFIG.offset[0]) + (endX - (startX + SKULL_CONFIG.offset[0])) * ease;
        group.position.y = (startY + SKULL_CONFIG.offset[1]) + (endY - (startY + SKULL_CONFIG.offset[1])) * ease;
        group.position.z = SKULL_CONFIG.offset[2] + Math.sin(self.progress * Math.PI) * TRAVEL.arcHeight;

        group.rotation.x = SKULL_CONFIG.rotation[0] + self.progress * TRAVEL.pitchDelta;
        group.rotation.y = SKULL_CONFIG.rotation[1] + self.progress * TRAVEL.yawDelta;
        
        const targetScale = SKULL_CONFIG.scale * TRAVEL.scaleRatio;
        group.scale.setScalar(THREE.MathUtils.lerp(SKULL_CONFIG.scale, targetScale, ease));

        // Trigger Idle when arrived
        if (self.progress >= TRAVEL.idleThreshold) {
          if (!idleRef.current.active) {
            idleRef.current = { active: true, time: 0, baseYaw: group.rotation.y, basePitch: group.rotation.x, baseScale: group.scale.x };
          }
        } else {
          idleRef.current.active = false;
        }
      }
    });

    const handleResize = () => { resetToHome(); ScrollTrigger.refresh(); };
    window.addEventListener("resize", handleResize);

    return () => {
      reveal.kill();
      travel.kill();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[100]" style={{ clipPath: "inset(100% 0 0 0)" }}>
      <Canvas camera={{ position: [0, 0, CAMERA.z], fov: CAMERA.fov }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <Environment preset="night" />
        {LIGHTS.map((l, i) => (
          l.type === "dir" ? <directionalLight key={i} position={l.position as any} intensity={l.intensity} color={l.color} /> :
          l.type === "point" ? <pointLight key={i} position={l.position as any} intensity={l.intensity} distance={l.distance} /> :
          <ambientLight key={i} intensity={l.intensity} />
        ))}
        <SkullMesh groupRef={groupRef} idleRef={idleRef} />
      </Canvas>
    </div>
  );
}