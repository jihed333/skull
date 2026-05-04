"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TranscendenceProps {
    progress: number;
    transitionIn: number;
    transitionOut: number;
    visible: boolean;
}

const NUM_EXPANSIONS = 12;
const POINTS_PER_EXPANSION = 64;
const NUM_WARPS = 500;

export function Transcendence({
    progress,
    transitionIn,
    transitionOut,
    visible,
}: TranscendenceProps) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const glassShellRef = useRef<THREE.Mesh>(null);
    const expansionsRef = useRef<THREE.LineSegments>(null);
    const warpsRef = useRef<THREE.InstancedMesh>(null);

    const { coreGeo, shellGeo, warpGeo, coreMat, shellMat, expansionMat, warpMat } = useMemo(() => {
        const cG = new THREE.IcosahedronGeometry(1.2, 32); // Reduced from 64
        const sG = new THREE.IcosahedronGeometry(1.4, 32); // Reduced from 64
        const wG = new THREE.DodecahedronGeometry(0.1, 1);
        
        const cM = new THREE.MeshStandardMaterial({
            color: "#0a0a12",
            emissive: "#4a2a40",
            emissiveIntensity: 1.0,
            roughness: 0.55,
            transparent: true,
            opacity: 0.75,
        });

        const sM = new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            transmission: 0.65,
            roughness: 0.005,
            ior: 1.38,
            thickness: 1.7,
            clearcoat: 0.5,
            clearcoatRoughness: 0.01,
            transparent: true,
        });

        const eM = new THREE.LineBasicMaterial({
            color: "#ffb3bd",
            transparent: true,
            opacity: 0.8,
            linewidth: 3.5,
            blending: THREE.AdditiveBlending,
        });

        const wM = new THREE.MeshBasicMaterial({
            color: "#ff98a2",
            transparent: true,
            opacity: 0.6,
        });

        return {
            coreGeo: cG,
            shellGeo: sG,
            warpGeo: wG,
            coreMat: cM,
            shellMat: sM,
            expansionMat: eM,
            warpMat: wM,
        };
    }, []);

    const expansionGeometry = useMemo(() => {
        const totalSegments = NUM_EXPANSIONS * (POINTS_PER_EXPANSION - 1);
        const positions = new Float32Array(totalSegments * 6);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    // Disposal cleanup
    React.useEffect(() => {
        return () => {
            coreGeo.dispose();
            shellGeo.dispose();
            warpGeo.dispose();
            expansionGeometry.dispose();
            coreMat.dispose();
            shellMat.dispose();
            expansionMat.dispose();
            warpMat.dispose();
        };
    }, [coreGeo, shellGeo, warpGeo, expansionGeometry, coreMat, shellMat, expansionMat, warpMat]);

    useMemo(() => {
        if (!warpsRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < NUM_WARPS; i++) {
            dummy.position.set(0, 0, 0);
            dummy.updateMatrix();
            warpsRef.current.setMatrixAt(i, dummy.matrix);
        }
        warpsRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    useFrame((state) => {
        if (!groupRef.current || !coreRef.current || !glassShellRef.current || !expansionsRef.current || !warpsRef.current) return;

        const t = state.clock.elapsedTime;
        const { pointer, camera } = state;
        const easeIn = THREE.MathUtils.smoothstep(0, 1, transitionIn);
        const easeOut = THREE.MathUtils.smoothstep(0, 1, transitionOut);

        // Parallax expansion
        groupRef.current.rotation.y = pointer.x * 0.4;
        groupRef.current.rotation.x = pointer.y * 0.35;

        // Camera epic sweep
        camera.position.z = THREE.MathUtils.lerp(8, 10, progress);
        camera.position.x = Math.cos(t * 0.1) * 3 + pointer.x * 2.5;
        camera.position.y = Math.sin(t * 0.1) * 2.5 + pointer.y * 2;
        camera.lookAt(groupRef.current.position);

        // Scale surge
        const heartScale = THREE.MathUtils.lerp(1.7, 2.2, easeIn + progress * 0.5) + Math.sin(t * 1.2) * 0.08;
        coreRef.current.scale.setScalar(heartScale);
        glassShellRef.current.scale.setScalar(heartScale);

        const breath = Math.sin(t * 1.1) * 0.045;
        coreRef.current.scale.multiplyScalar(1 + breath);
        glassShellRef.current.scale.multiplyScalar(1 + breath * 1.15);

        groupRef.current.rotation.y = t * 0.04 + pointer.x * 0.2;
        coreRef.current.rotation.y = t * 0.1 + pointer.x * 0.15;
        glassShellRef.current.rotation.x = Math.sin(t * 0.3) * 0.32 + pointer.y * 0.18;

        const fade = (1 - easeOut) * Math.min(easeIn + 0.3, 1);

        coreMat.opacity = fade * 0.75;
        shellMat.transmission = THREE.MathUtils.lerp(0.58, 0.5, progress);
        shellMat.opacity = fade;

        // Expansions with chaotic warping
        const posAttr = expansionsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        const expansionLength = THREE.MathUtils.lerp(45, 80, progress);
        const warpFactor = progress * 0.9;

        let idx = 0;
        for (let i = 0; i < NUM_EXPANSIONS; i++) {
            const baseAngle = (i / NUM_EXPANSIONS) * Math.PI * 2 + t * 0.15;

            for (let j = 0; j < POINTS_PER_EXPANSION - 1; j++) {
                const p0 = j / (POINTS_PER_EXPANSION - 1);
                const p1 = (j + 1) / (POINTS_PER_EXPANSION - 1);

                const distort = (Math.sin(p0 * 18 + t * 1.5) * Math.cos(p0 * 9 + t * 0.75)) * 0.7 * warpFactor;
                const radius = 3.2 + p0 * 5 + distort * 1.5;

                const z0 = p0 * expansionLength + distort * 4;
                const z1 = p1 * expansionLength + distort * 4;

                const angle0 = baseAngle + distort;
                const angle1 = baseAngle + distort;

                arr[idx++] = Math.cos(angle0) * radius;
                arr[idx++] = Math.sin(angle0) * radius;
                arr[idx++] = z0;

                arr[idx++] = Math.cos(angle1) * radius;
                arr[idx++] = Math.sin(angle1) * radius;
                arr[idx++] = z1;
            }
        }
        posAttr.needsUpdate = true;
        expansionMat.opacity = fade * 0.8;

        // Warps with explosive scaling
        const dummy = new THREE.Object3D();
        for (let i = 0; i < NUM_WARPS; i++) {
            warpsRef.current.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            const pathIndex = i % NUM_EXPANSIONS;
            const pathProgress = (t * 1.5 + i * 0.04) % 1;
            const p = pathProgress;
            const distort = (Math.sin(p * 18 + t * 1.5) * Math.cos(p * 9 + t * 0.75)) * 0.7 * warpFactor;
            const angle = (pathIndex / NUM_EXPANSIONS) * Math.PI * 2 + t * 0.15 + distort;
            const radius = 3.2 + p * 5 + distort * 1.5;
            dummy.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                p * expansionLength + distort * 4
            );
            dummy.scale.setScalar(1 + Math.sin(t + i * 0.3) * 0.5);
            dummy.updateMatrix();
            warpsRef.current.setMatrixAt(i, dummy.matrix);
        }
        warpsRef.current.instanceMatrix.needsUpdate = true;
        warpMat.opacity = fade * 0.65;

        // Dive
        const dive = transitionIn * 10 - transitionOut * 8;
        groupRef.current.position.z = dive - 1;

        groupRef.current.position.x = Math.sin(t * 0.15) * 0.45 + pointer.x * 0.7;
        groupRef.current.position.y = Math.cos(t * 0.1) * 0.4 + pointer.y * 0.6;
    });

    if (!visible) return null;

    return (
        <group ref={groupRef}>
            <mesh ref={coreRef} geometry={coreGeo} material={coreMat} frustumCulled={false} />
            <mesh ref={glassShellRef} geometry={shellGeo} material={shellMat} frustumCulled={false} />
            <lineSegments ref={expansionsRef} geometry={expansionGeometry} material={expansionMat} frustumCulled={false} />
            <instancedMesh ref={warpsRef} args={[warpGeo, warpMat, NUM_WARPS]} frustumCulled={false} />
        </group>
    );
}
