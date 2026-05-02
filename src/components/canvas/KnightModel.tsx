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
  const { gl } = useThree();

  // ─────────────────────────────────────────────
  // Load Model
  // ─────────────────────────────────────────────
  const { scene } = useGLTF(
    "/models/chess_knight_006-draco.glb",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  // ─────────────────────────────────────────────
  // Scroll Progress Control
  // ─────────────────────────────────────────────
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
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    return () => st.kill();
  }, []);

  // ─────────────────────────────────────────────
  // Model + PREMIUM Material (MATCH THINKER)
  // ─────────────────────────────────────────────
  const [knightInst, material] = useMemo(() => {
    const inst = scene.clone();

    // Scale & center
    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    const scale = max > 0 ? 1.4 / max : 1;
    inst.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    inst.position.sub(center).multiplyScalar(scale);

    // 🎨 Match the skull's dark obsidian chrome material
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
        child.castShadow = !isMobile;
        child.receiveShadow = !isMobile;
      }
    });

    return [inst, mat];
  }, [scene, isMobile]);

  // ─────────────────────────────────────────────
  // Environment Lighting (MATCH THINKER FEEL)
  // ─────────────────────────────────────────────
  // Environment Lighting is now inherited from GlobalSkullCanvas <Environment preset="night" />

  // ─────────────────────────────────────────────
  // Animation Loop (Cinematic Motion)
  // ─────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const g = groupRef.current;
    const p = progressRef.current;

    if (p <= 0 || p >= 1) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Calculate exact viewport dimensions at the Knight's Z-depth (-1.5)
    const cam = state.camera as THREE.PerspectiveCamera;
    const dist = cam.position.z - (-1.5);
    const fov = cam.fov * (Math.PI / 180);
    const vHeight = 2 * Math.tan(fov / 2) * dist;
    const vWidth = vHeight * state.viewport.aspect;

    // Center of the right half of the screen
    const targetX = vWidth / 4;

    // Travel perfectly straight from top to bottom
    const startY = vHeight / 2 + 3;
    const endY = -vHeight / 2 - 4; // Extend runway well below screen
    let targetY = THREE.MathUtils.lerp(startY, endY, p);

    let scale = 1;
    let opacity = 1;
    let targetZ = -1.5;

    // 🔥 Cinematic Fade & Shrink (Awwwards Style)
    if (p < 0.1) {
      // Fade in smoothly at the very beginning
      const progressIn = p / 0.1;
      opacity = progressIn;
      scale = 0.5 + 0.5 * progressIn;
    } else if (p > 0.8) {
      // Suck into the void at the bottom (bypasses Safari bar issues completely)
      const progressOut = (p - 0.8) / 0.2; // 0 to 1
      const easeOut = 1 - Math.pow(1 - progressOut, 3); // Cubic ease out
      
      opacity = 1 - Math.pow(progressOut, 2); // Smooth fade out
      scale = 1 - 0.6 * easeOut; // Shrink significantly
      targetY -= easeOut * 2.5; // Accelerate downward
      targetZ = -1.5 - easeOut * 3; // Fall backward into the darkness
    }

    // Apply strictly to avoid double-damping jitter
    g.position.set(targetX, targetY, targetZ);
    g.scale.setScalar(scale);

    // Apply opacity directly to the material
    if (material.opacity !== opacity) {
      material.opacity = opacity;
    }

    // Rotation
    const targetRotX = p * Math.PI * 3;
    const targetRotY = -2 + p * Math.PI;

    // Frame-rate independent damping for smooth rotation
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, 4, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, 4, delta);
  });

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <group ref={groupRef} visible={visible}>
      <primitive object={knightInst} />
    </group>
  );
}


// Preload
useGLTF.preload(
  "/models/chess_knight_006-draco.glb",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);