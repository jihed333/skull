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

    // 🎨 Cinematic Metal Material (MATCH THINKER)
    // Optimized for mobile: use Standard instead of Physical if mobile
    const mat = isMobile 
      ? new THREE.MeshStandardMaterial({
          color: new THREE.Color("#dfdfdf"),
          metalness: 1.0,
          roughness: 0.2,
          envMapIntensity: 1.0,
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#dfdfdf"),
          metalness: 1.0,
          roughness: 0.1,
          envMapIntensity: 2.0,
          clearcoat: 0.25,
          clearcoatRoughness: 0.18,
          reflectivity: 3,
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
  useEffect(() => {
    // Skip heavy environment generation on mobile
    if (isMobile) return;

    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();

    // soft neutral background
    envScene.background = new THREE.Color(0x1a1a1a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    envScene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(5, 6, 4);
    envScene.add(key);

    const rim = new THREE.DirectionalLight(0xff98a2, 1.5);
    rim.position.set(-4, -2, -3);
    envScene.add(rim);

    const rt = pmrem.fromScene(envScene);
    material.envMap = rt.texture;
    material.needsUpdate = true;

    return () => {
      pmrem.dispose();
      rt.dispose();
    };
  }, [gl, material, isMobile]);

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

    // Vertical cinematic travel
    const targetY = 8 - p * 16;
    g.position.y += (targetY - g.position.y) * 0.08;

    // Horizontal drift
    g.position.x = 2 - p * 1.5;
    g.position.z = -1.5;

    // Rotation
    const targetRotX = p * Math.PI * 3;
    const targetRotY = -2 + p * Math.PI;

    g.rotation.x += (targetRotX - g.rotation.x) * 0.05;
    g.rotation.y += (targetRotY - g.rotation.y) * 0.05;
  });

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <group ref={groupRef} visible={visible}>
      <primitive object={knightInst} />

      {/* 🔥 Cinematic Lighting Setup */}
      {/* Reduced lighting on mobile */}
      {!isMobile && (
        <>
          <spotLight
            position={[4, 6, 3]}
            intensity={3.2}
            angle={0.4}
            penumbra={0.6}
            color="#ffffff"
          />
          <pointLight
            position={[-4, -2, -2]}
            intensity={2.0}
            color="#ffd1c7"
          />
          <pointLight
            position={[2, -3, -4]}
            intensity={2.8}
            color="#ff98a2"
          />
        </>
      )}
      {isMobile && (
        <directionalLight position={[2, 4, 3]} intensity={2.0} color="#ffffff" />
      )}
    </group>
  );
}


// Preload
useGLTF.preload(
  "/models/chess_knight_006-draco.glb",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);