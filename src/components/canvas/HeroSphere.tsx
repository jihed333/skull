"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export function HeroSphere({
  progress,
  visible,
}: {
  progress: number;
  visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const { scene } = useGLTF("/models/fibonacci_sphere-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

  const targetMouse = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });

  /* ----------------------------- */
  /* Mouse tracking */
  /* ----------------------------- */

  useEffect(() => {
    const move = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ----------------------------- */
  /* Model optimization */
  /* ----------------------------- */

  useEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.computeBoundingSphere();

      const r = child.geometry.boundingSphere?.radius ?? 1;

      if (r < 0.5) child.visible = false;

      child.castShadow = false;
      child.receiveShadow = false;

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((m) => {
        m.transparent = true;
        m.side = THREE.DoubleSide;
      });
    });
  }, [scene]);

  /* ----------------------------- */
  /* Frame animation */
  /* ----------------------------- */

  useFrame((state) => {
    if (!group.current || !visible) return;

    const t = state.clock.elapsedTime;

    /* Cinematic easing */

    const ease = 1 - Math.pow(1 - progress, 3);

    /* Mouse smoothing */

    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, targetMouse.current.x, 0.08);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, targetMouse.current.y, 0.08);

    /* Floating motion */

    // Shift to the right side responsively, sliding to center as we zoom/scroll
    const isMobile = window.innerWidth < 768;
    const targetShiftX = isMobile ? 1.2 : 3.8;
    const shiftX = THREE.MathUtils.lerp(targetShiftX, 0, ease);

    const floatY = Math.sin(t * 0.6) * 0.15;
    const floatX = Math.cos(t * 0.4) * 0.08;

    group.current.position.set(shiftX + floatX, floatY, 0);

    /* Rotation choreography */

    group.current.rotation.x =
      0.5 + // Adjust this value to change its initial up/down tilt
      t * 0.05 + mouse.current.y * 0.25;

    group.current.rotation.y =
      9.0 + // Adjust this value to change its initial facing angle (left/right spin)
      t * 0.08 +
      mouse.current.x * 0.45 +
      ease * 4.2;

    group.current.rotation.z =
      0.0 + // Adjust this value to tilt it sideways
      ease * 0.65;

    /* Camera cinematic path */

    const startDistance = 11;
    const endDistance = 0.45;

    const distance = THREE.MathUtils.lerp(
      startDistance,
      endDistance,
      ease
    );

    const orbit = ease * 0.55;

    const camX =
      Math.sin(orbit) * distance * 0.35 +
      mouse.current.x * 1.5;

    const camY =
      Math.sin(orbit * 0.7) * 2.1 +
      mouse.current.y * 0.9;

    const camZ = Math.cos(orbit) * distance;

    camera.position.set(camX, camY, camZ);

    camera.lookAt(0, 0, 0);

    /* Cinematic scaling */

    const scale = THREE.MathUtils.lerp(
      0.05,
      1.35,
      ease
    );

    group.current.scale.setScalar(scale);

    /* Fade out */

    const fade = THREE.MathUtils.smoothstep(
      progress,
      0.85,
      1
    );

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((m) => {
        m.opacity = 1 - fade;
      });
    });
  });

  if (!visible) return null;

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/fibonacci_sphere-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");