"use client";

import React, { useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useScrollContext } from "@/components/providers/SmoothScrollProvider";

// New 7-stage components
import { KnightModel } from "./KnightModel";
// ====================================================================
// SCROLL-DRIVEN SCENE (updated)
// ====================================================================
function ScrollDrivenScene() {
  const { scrollProgress } = useScrollContext();
  const groupRef = useRef<THREE.Group>(null);

  // Breathing animation — always alive
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
      groupRef.current.rotation.x =
        Math.cos(state.clock.elapsedTime * 0.08) * 0.01;
    }
  });

  // Map scroll progress to 7 sections (0-1 range, each section ~0.142)
  const sectionProgress = (section: number) => {
    const sectionSize = 1 / 7;
    const start = section * sectionSize;
    const end = start + sectionSize;
    return Math.max(0, Math.min(1, (scrollProgress - start) / (end - start)));
  };

  return (
    <group ref={groupRef}>
      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.15} color="#c0c0ff" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.5}
        color="#ffffff"
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#ff98a2" />

      {/* Projects Parallax Sculpture Scene */}
      <KnightModel
        visible={scrollProgress >= 0.35}
      />
    </group>
  );
}

export default function Scene() {

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 70 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 1000 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent", pointerEvents: "none" }}
      >
        <fog attach="fog" args={["#000000", 10, 50]} />
        <Suspense fallback={null}>
          <ScrollDrivenScene />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}