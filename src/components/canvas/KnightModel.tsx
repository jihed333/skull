"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface KnightModelProps {
  visible: boolean;
  isMobile?: boolean;
}

export function KnightModel({ visible, isMobile = false }: KnightModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  // ── useThree: only grab what we actually use ──────────────────────────────
  const { viewport } = useThree();

  // ── Load ──────────────────────────────────────────────────────────────────
  const { scene } = useGLTF(
    "/models/chess_knight_006-draco.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  // ── Scroll Progress ───────────────────────────────────────────────────────
  useEffect(() => {
    const projectsWrapper = document.getElementById("projects-wrapper");
    const philosophySection = document.getElementById("philosophy-section");
    if (!projectsWrapper || !philosophySection) return;

    const st = ScrollTrigger.create({
      trigger: projectsWrapper,
      start: "top 1%",
      endTrigger: philosophySection,
      end: "top 90%",
      scrub: 1.25,
      onUpdate: (self) => { progressRef.current = self.progress; },
    });
    return () => st.kill();
  }, []);

  // ── Material + Model (single shared material — 0 extra DC) ────────────────
  const [knightInst, material] = useMemo(() => {
    const inst = scene.clone();

    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    const scale = max > 0 ? 1.4 / max : 1;
    inst.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    inst.position.sub(center).multiplyScalar(scale);

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 1.0,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.5,
      transparent: true,
      opacity: 1,
    });

    inst.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = mat;
        // No shadow-casting lights in the global canvas → both flags = 0 DC overhead
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    return [inst, mat];
  }, [scene]);

  // ── Animation Loop ────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const g = groupRef.current;
    const p = progressRef.current;

    if (p <= 0 || p >= 1) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Derive viewport dimensions from R3F viewport (no manual trig needed)
    const cam = state.camera as THREE.PerspectiveCamera;
    const dist = cam.position.z - (-1.5);
    const fov = cam.fov * (Math.PI / 180);
    const vHeight = 2 * Math.tan(fov / 2) * dist;
    const vWidth = vHeight * state.viewport.aspect;

    const targetX = vWidth / 4;
    const startY = vHeight / 2 + 3;
    const endY = -vHeight / 2 - 4;
    const targetY = THREE.MathUtils.lerp(startY, endY, p);

    let scale = 1;
    let opacity = 1;
    const targetZ = -1.5;

    if (p < 0.1) {
      const progressIn = p / 0.1;
      opacity = progressIn;
      scale = 0.5 + 0.5 * progressIn;
    }

    g.position.set(targetX, targetY, targetZ);
    g.scale.setScalar(scale);

    if (material.opacity !== opacity) material.opacity = opacity;

    const targetRotX = p * Math.PI * 3;
    const targetRotY = -2 + p * Math.PI;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, 4, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, 4, delta);
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => { material.dispose(); }, [material]);

  return (
    <group ref={groupRef} visible={visible}>
      <primitive object={knightInst} />
    </group>
  );
}

useGLTF.preload(
  "/models/chess_knight_006-draco.glb",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);