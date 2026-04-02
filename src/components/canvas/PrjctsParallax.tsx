"use client";

import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   PrjctsParallax – React-Three-Fiber port of the vanilla script.
   ALL geometry, materials, lighting, parallax speeds, idle
   animations, and env-map logic are kept EXACTLY as the original.
   ================================================================ */

interface PrjctsParallaxProps {
  progress: number;
  visible: boolean;
}

/* ────────────────── helpers (unchanged geometry builders) ────────────────── */

function createPortalArchGeo(
  radius: number,
  tubeRadius: number,
  arcAngle: number
): THREE.TubeGeometry {
  const curve = new THREE.EllipseCurve(
    0,
    0,
    radius,
    radius * 1.3,
    0,
    arcAngle,
    false,
    0
  );
  const points = curve.getPoints(64);
  const tubePath = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, p.y, 0))
  );
  return new THREE.TubeGeometry(tubePath, 64, tubeRadius, 12, false);
}

function createFrameGeo(
  w: number,
  h: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();
  const hole = new THREE.Path();
  const inset = thickness;
  hole.moveTo(-w / 2 + inset, -h / 2 + inset);
  hole.lineTo(w / 2 - inset, -h / 2 + inset);
  hole.lineTo(w / 2 - inset, h / 2 - inset);
  hole.lineTo(-w / 2 + inset, h / 2 - inset);
  hole.closePath();
  shape.holes.push(hole);
  const extrudeSettings = {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/* ─────────────────────────────────────────────────────────────────────────── */

export function PrjctsParallax({ progress, visible }: PrjctsParallaxProps) {
  const rootGroup = useRef<THREE.Group>(null);
  const { gl: renderer, scene: rootScene } = useThree();

  // Load the requested 3D models
  const armillarySphere = useGLTF("/models/armillary_sphere-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const faceMaskModel = useGLTF("/models/face_mask-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const knightModel = useGLTF("/models/chess_knight_006-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

  /* ── mouse tracking (same logic) ── */
  const targetMouse = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ── scroll tracking (same logic) ── */
  const scrollState = useRef({ scrollY: 0, targetScroll: 0 });

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      scrollState.current.targetScroll += e.deltaY * 0.001;
      scrollState.current.targetScroll = Math.max(
        -2,
        Math.min(8, scrollState.current.targetScroll)
      );
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Materials (memoised, exactly as original) ── */
  const mats = useMemo(() => {
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.95,
      roughness: 0.15,
      envMapIntensity: 1.8,
    });
    const darkSilverMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.25,
      envMapIntensity: 1.2,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.6,
      thickness: 0.3,
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 0.8,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.85,
      roughness: 0.3,
      envMapIntensity: 1.0,
    });
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });
    const smallSphereMat = new THREE.MeshStandardMaterial({
      color: 0xbbbbbb,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 2.0,
    });
    const sphereMirrorMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 1.0,
      roughness: 0.03,
      envMapIntensity: 2.5,
    });

    return {
      silverMat,
      darkSilverMat,
      glassMat,
      frameMat,
      haloMat,
      smallSphereMat,
      sphereMirrorMat,
    };
  }, []);

  /* ── Build all meshes once (imperatively, same geometry & positions) ── */
  const refs = useRef<{
    thinker: THREE.Group;
    faceMask: THREE.Group;
    knight: THREE.Group;
    pointBlush: THREE.PointLight;
    layers: {
      background: THREE.Group;
      midground: THREE.Group;
      foreground: THREE.Group;
    };
    layerData: Record<
      string,
      {
        children: {
          mesh: THREE.Object3D;
          origPos: THREE.Vector3;
          origRot: THREE.Euler;
        }[];
      }
    >;
    cubeCamera: THREE.CubeCamera;
    cubeRenderTarget: THREE.WebGLCubeRenderTarget;
  } | null>(null);

  const envNeedsUpdate = useRef(true);
  const frameCount = useRef(0);

  /* Build scene graph once, attach to rootGroup */
  useEffect(() => {
    if (!rootGroup.current) return;
    const parent = rootGroup.current;

    const {
      silverMat,
      darkSilverMat,
      glassMat,
      frameMat,
      haloMat,
      smallSphereMat,
      sphereMirrorMat,
    } = mats;

    /* ── Parallax layer system ── */
    const background = new THREE.Group();
    const midground = new THREE.Group();
    const foreground = new THREE.Group();
    parent.add(background, midground, foreground);
    const parallaxLayers = { background, midground, foreground };

    /* ── The Centerpiece Sculpture (Armillary Sphere) ── */
    const thinker = new THREE.Group();
    const modelInstance = armillarySphere.scene.clone();

    // Auto-scale to roughly 4.5 units (massive centerpiece as requested)
    const box = new THREE.Box3().setFromObject(modelInstance);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, Math.max(size.y, size.z));
    const scale = maxDim > 0 ? 7 / maxDim : 1;
    modelInstance.scale.setScalar(scale);

    // Auto-center the deeply nested model so it pivots beautifully
    const center = box.getCenter(new THREE.Vector3());
    modelInstance.position.sub(center).multiplyScalar(scale);

    // Apply the perfectly smooth polished silver material to every part
    modelInstance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = silverMat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    thinker.add(modelInstance);
    // Move out of view initially, animated sequentially in useFrame
    thinker.position.set(0, 10, 0);
    // Add subtle base tilt to match original aesthetic
    thinker.rotation.x = 0.12;

    parent.add(thinker);

    /* ── Portal arches (Removed) ── */
    /* ── Frames (Removed) ── */

    /* ── Face Mask (Prominent Floating Scene Element) ── */
    const faceMask = new THREE.Group();
    const faceMaskInst = faceMaskModel.scene.clone();

    // Auto-scale to roughly 4.5 units tall so it's impossible to miss
    const fmBox = new THREE.Box3().setFromObject(faceMaskInst);
    const fmSize = fmBox.getSize(new THREE.Vector3());
    const fmMax = Math.max(fmSize.x, Math.max(fmSize.y, fmSize.z));
    const fmScale = fmMax > 0 ? 4.5 / fmMax : 1;
    faceMaskInst.scale.setScalar(fmScale);

    // Auto-center
    const fmCenter = fmBox.getCenter(new THREE.Vector3());
    faceMaskInst.position.sub(fmCenter).multiplyScalar(fmScale);

    // Apply silver sphere material to mask
    faceMaskInst.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = sphereMirrorMat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    faceMask.add(faceMaskInst);

    // Add dedicated lights EXCLUSIVELY to the mask so it violently pops (EXTREME INTENSITY)
    const maskKeyLight = new THREE.PointLight(0xffffff, 25.0, 30);
    maskKeyLight.position.set(2, 2, 4);
    
    const maskRimLight = new THREE.PointLight(0x8aa7ff, 15.0, 25);
    maskRimLight.position.set(-3, 1, -2);

    const maskPinkGlow = new THREE.PointLight(0xff98a2, 10.0, 15);
    maskPinkGlow.position.set(0, -2, 2);
    
    faceMask.add(maskKeyLight, maskRimLight, maskPinkGlow);

    // Move completely out of view initially, animated sequentially in useFrame
    faceMask.position.set(-2.5, 10, 2.0);
    faceMask.rotation.y = 0.6; // Angle it inwards
    parent.add(faceMask);

    /* ── Chess Knight (Prominent Floating Element Right) ── */
    const knight = new THREE.Group();
    const knightInst = knightModel.scene.clone();

    // Auto-scale to roughly 3.5 units tall
    const knightBox = new THREE.Box3().setFromObject(knightInst);
    const knightSize = knightBox.getSize(new THREE.Vector3());
    const knightMax = Math.max(knightSize.x, Math.max(knightSize.y, knightSize.z));
    const knightScale = knightMax > 0 ? 3.5 / knightMax : 1;
    knightInst.scale.setScalar(knightScale);

    // Auto-center
    const knightCenter = knightBox.getCenter(new THREE.Vector3());
    knightInst.position.sub(knightCenter).multiplyScalar(knightScale);

    // Apply silver sphere material to knight
    knightInst.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = sphereMirrorMat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    knight.add(knightInst);

    // No local lights for the knight per user request.
    
    // Move completely out of view initially, animated sequentially in useFrame
    knight.position.set(2.5, 15, 1.5);
    knight.rotation.y = -0.5; // Angle it inwards toward the center
    parent.add(knight);

    /* ── Lighting ── */
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.8);
    parent.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf5f0eb, 2.0);
    keyLight.position.set(3, 4, 3);
    parent.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffb8a0, 1.5);
    rimLight.position.set(-4, 3, -4);
    parent.add(rimLight);

    const rimLight2 = new THREE.DirectionalLight(0xe8d8d0, 1.0);
    rimLight2.position.set(6, 2, -3);
    parent.add(rimLight2);

    const fillLight = new THREE.DirectionalLight(0x8888aa, 0.8);
    fillLight.position.set(0, -2, 2);
    parent.add(fillLight);

    const pointBlush = new THREE.PointLight(0xffb0a0, 2.0, 50);
    pointBlush.position.set(-3.5, 2, 2);
    parent.add(pointBlush);

    const pointCool = new THREE.PointLight(0xa0a8c0, 1.5, 40);
    pointCool.position.set(4, 1.5, -2);
    parent.add(pointCool);

    /* ── Env-map cube camera ── */
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeRenderTarget);

    /* ── Store initial positions for parallax ── */
    const parallaxSpeeds: Record<string, number> = {
      background: 0.15,
      midground: 0.4,
      foreground: 0.75,
    };

    const layerData: Record<
      string,
      {
        children: {
          mesh: THREE.Object3D;
          origPos: THREE.Vector3;
          origRot: THREE.Euler;
        }[];
      }
    > = {};

    (["background", "midground", "foreground"] as const).forEach((name) => {
      const group = parallaxLayers[name];
      layerData[name] = {
        children: group.children.map((child) => ({
          mesh: child,
          origPos: child.position.clone(),
          origRot: child.rotation.clone(),
        })),
      };
    });

    /* ── Persist refs for animation loop ── */
    refs.current = {
      thinker,
      faceMask,
      knight,
      pointBlush,
      layers: parallaxLayers,
      layerData,
      cubeCamera,
      cubeRenderTarget,
    };

    envNeedsUpdate.current = true;
    frameCount.current = 0;

    /* Cleanup */
    return () => {
      // Remove everything we added
      while (parent.children.length) {
        parent.remove(parent.children[0]);
      }
      cubeRenderTarget.dispose();
    };
  }, [mats]);

  /* ── Per-frame animation (exactly matching original animate()) ── */
  useFrame((state) => {
    if (!refs.current || !visible) return;

    const time = state.clock.elapsedTime;
    frameCount.current++;

    const {
      thinker,
      faceMask,
      knight,
      pointBlush,
      layerData,
      cubeCamera,
      cubeRenderTarget,
    } = refs.current;

    const {
      silverMat,
      darkSilverMat,
      frameMat,
      haloMat,
      smallSphereMat,
      sphereMirrorMat,
    } = mats;

    const parallaxSpeeds: Record<string, number> = {
      background: 0.15,
      midground: 0.4,
      foreground: 0.75,
    };

    // Smooth scroll
    scrollState.current.scrollY +=
      (scrollState.current.targetScroll - scrollState.current.scrollY) * 0.05;
    const sY = scrollState.current.scrollY;

    // Smooth mouse
    mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.04;
    mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.04;
    const mX = mouse.current.x;
    const mY = mouse.current.y;

    // Parallax scroll per layer
    (["background", "midground", "foreground"] as const).forEach((name) => {
      const speed = parallaxSpeeds[name];
      const data = layerData[name];
      data.children.forEach(({ mesh, origPos, origRot }) => {
        mesh.position.y = origPos.y - sY * speed;
        mesh.position.x = origPos.x + mX * speed * 0.3;
        mesh.rotation.y = origRot.y + mX * 0.02 * speed;
      });
    });

    // ====== 3D ELEMENT CINEMATIC CHOREOGRAPHY (Act 1, 2, 3) ======
    const posLerp = 0.06;

    // ACT 1: Armillary Sphere (peaks at sY = 1.0)
    const armillaryTargetY = 0.0 - (sY - 1.0) * 4.0;
    thinker.position.y += (armillaryTargetY - thinker.position.y) * posLerp;
    thinker.position.x = 0 + Math.sin(time * 0.2) * 0.1 + mX * 0.2;
    thinker.position.z = 0;
    thinker.rotation.x = 0.12 + (sY - 1.0) * 0.2;  // Dynamic tilt 
    thinker.rotation.y = time * 0.5 + mX * 0.1;    // Continuous beautiful spin

    // ACT 2: Face Mask (peaks at sY = 3.5)
    // Offset slightly left (-1.5) and floating
    const maskTargetY = 0.5 - (sY - 3.5) * 4.5;
    faceMask.position.y += (maskTargetY - faceMask.position.y) * posLerp;
    faceMask.position.x = -1.5 + Math.sin(time * 0.3) * 0.1 + mX * 0.3;
    faceMask.position.z = 1.0;
    faceMask.rotation.x = 0;
    faceMask.rotation.y = 0.6;
    faceMask.rotation.z = 0;

    // ACT 3: Chess Knight (peaks at sY = 7.5 to fit within the 8.0 clamp)
    // Delayed properly so it appears later during the scroll.
    const knightTargetY = 0.5 - (sY - 7.8) * 4.5;
    knight.position.y += (knightTargetY - knight.position.y) * posLerp;
    knight.position.x = 1.5 + Math.sin(time * 0.45) * 0.1 + mX * 0.3;
    knight.position.z = 1.0;
    knight.rotation.x = (sY - 7.8) * -0.3;
    knight.rotation.y = -0.5 + time * -0.4;
    knight.rotation.z = Math.sin(time * 0.45) * 0.05;

    // Blush point light pulse
    pointBlush.intensity = 1.5 + Math.sin(time * 0.8) * 0.2;

    // Environment map update
    if (envNeedsUpdate.current || frameCount.current % 60 === 0) {
      cubeCamera.position.set(0, 0, 0);
      cubeCamera.update(renderer, rootScene);

      const envMap = cubeRenderTarget.texture;
      silverMat.envMap = envMap;
      darkSilverMat.envMap = envMap;
      sphereMirrorMat.envMap = envMap;
      frameMat.envMap = envMap;
      haloMat.envMap = envMap;
      smallSphereMat.envMap = envMap;

      envNeedsUpdate.current = false;
    }

    // Smoothly transition camera to the original PrjctsParallax view
    state.camera.position.lerp(
      new THREE.Vector3(mX * 0.3, 0.5 + mY * 0.2, 8),
      0.05
    );
    state.camera.lookAt(0, 0.2, 0);
  });

  return <group ref={rootGroup} visible={visible} />;
}

// Preload the models so there is no delay when the user scrolls down
useGLTF.preload("/models/armillary_sphere-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
useGLTF.preload("/models/face_mask-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
useGLTF.preload("/models/chess_knight_006-draco.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");


