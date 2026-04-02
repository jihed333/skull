"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HarmonyProps {
    progress: number;
    transitionIn: number;
    transitionOut: number;
    visible: boolean;
}

const NUM_EQUILIBRIA = 12;
const POINTS_PER_EQUILIBRIUM = 64;
const NUM_SYMBIOTES = 600;

export function Harmony({
    progress,
    transitionIn,
    transitionOut,
    visible,
}: HarmonyProps) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const glassShellRef = useRef<THREE.Mesh>(null);
    const equilibriaRef = useRef<THREE.LineSegments>(null);
    const symbiotesRef = useRef<THREE.InstancedMesh>(null);

    const { coreGeo, shellGeo, symbioteGeo } = useMemo(() => ({
        coreGeo: new THREE.IcosahedronGeometry(1.2, 64),
        shellGeo: new THREE.IcosahedronGeometry(1.4, 64),
        symbioteGeo: new THREE.IcosahedronGeometry(0.05, 3),
    }), []);

    const equilibriumGeometry = useMemo(() => {
        const totalSegments = NUM_EQUILIBRIA * (POINTS_PER_EQUILIBRIUM - 1);
        const positions = new Float32Array(totalSegments * 6);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useMemo(() => {
        if (!symbiotesRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < NUM_SYMBIOTES; i++) {
            dummy.position.set(0, 0, 0);
            dummy.updateMatrix();
            symbiotesRef.current.setMatrixAt(i, dummy.matrix);
        }
        symbiotesRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    useFrame((state) => {
        if (!groupRef.current || !coreRef.current || !glassShellRef.current || !equilibriaRef.current || !symbiotesRef.current) return;

        const t = state.clock.elapsedTime;
        const { pointer, camera } = state;
        const easeIn = THREE.MathUtils.smoothstep(0, 1, transitionIn);
        const easeOut = THREE.MathUtils.smoothstep(0, 1, transitionOut);

        // Gentle parallax
        groupRef.current.rotation.y = pointer.x * 0.1;
        groupRef.current.rotation.x = pointer.y * 0.08;

        // Camera slow orbit for resolution
        camera.position.z = THREE.MathUtils.lerp(10, 7, progress);
        camera.position.x = Math.sin(t * 0.05) * 1 + pointer.x * 0.5;
        camera.position.y = Math.cos(t * 0.05) * 0.5 + pointer.y * 0.5;
        camera.lookAt(0, 0, 0);

        // Harmonized scale
        const heartScale = THREE.MathUtils.lerp(2.2, 1.6, easeIn) + Math.sin(t * 0.6) * 0.04;
        coreRef.current.scale.setScalar(heartScale);
        glassShellRef.current.scale.setScalar(heartScale);

        const breath = Math.sin(t * 0.9) * 0.03;
        coreRef.current.scale.multiplyScalar(1 + breath);
        glassShellRef.current.scale.multiplyScalar(1 + breath * 0.7);

        groupRef.current.rotation.y = t * 0.03 + pointer.x * 0.05;
        coreRef.current.rotation.y = t * 0.09 + pointer.x * 0.08;
        glassShellRef.current.rotation.x = Math.sin(t * 0.25) * 0.2 + pointer.y * 0.1;

        const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
        const shellMat = glassShellRef.current.material as THREE.MeshPhysicalMaterial;
        const fade = (1 - easeOut) * Math.min(easeIn + 0.3, 1);

        coreMat.opacity = fade * 0.9;
        shellMat.transmission = THREE.MathUtils.lerp(0.5, 0.95, progress);
        shellMat.opacity = fade;

        // Equilibria with synchronized loops
        const posAttr = equilibriaRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        const equilibriumLength = THREE.MathUtils.lerp(55, 35, progress);
        const loopFactor = 0.6 + progress * 0.5;

        let idx = 0;
        for (let i = 0; i < NUM_EQUILIBRIA; i++) {
            const baseAngle = (i / NUM_EQUILIBRIA) * Math.PI * 2 + t * 0.1;

            for (let j = 0; j < POINTS_PER_EQUILIBRIUM - 1; j++) {
                const p0 = j / (POINTS_PER_EQUILIBRIUM - 1);
                const p1 = (j + 1) / (POINTS_PER_EQUILIBRIUM - 1);

                const loop = Math.sin(p0 * Math.PI * 3 * loopFactor) * 3;
                const radius = 4 + loop;

                const z0 = Math.cos(p0 * Math.PI * 3 * loopFactor) * equilibriumLength;
                const z1 = Math.cos(p1 * Math.PI * 3 * loopFactor) * equilibriumLength;

                const angle0 = baseAngle + p0 * 2;
                const angle1 = baseAngle + p1 * 2;

                arr[idx++] = Math.cos(angle0) * radius;
                arr[idx++] = Math.sin(angle0) * radius;
                arr[idx++] = z0;

                arr[idx++] = Math.cos(angle1) * radius;
                arr[idx++] = Math.sin(angle1) * radius;
                arr[idx++] = z1;
            }
        }
        posAttr.needsUpdate = true;

        const equilibriumMat = equilibriaRef.current.material as THREE.LineBasicMaterial;
        equilibriumMat.opacity = fade * 0.95;

        // Symbiotes with harmonious flow
        const dummy = new THREE.Object3D();
        for (let i = 0; i < NUM_SYMBIOTES; i++) {
            symbiotesRef.current.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            const pathIndex = i % NUM_EQUILIBRIA;
            const pathProgress = (t * 0.8 + i * 0.015) % 1;
            const p = pathProgress;
            const loop = Math.sin(p * Math.PI * 3 * loopFactor) * 3;
            const radius = 4 + loop;
            const angle = (pathIndex / NUM_EQUILIBRIA) * Math.PI * 2 + t * 0.1 + p * 2;
            dummy.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                Math.cos(p * Math.PI * 3 * loopFactor) * equilibriumLength
            );
            dummy.rotation.set(t * 0.3, t * 0.2, t * 0.4);
            dummy.scale.setScalar(1 + Math.sin(t + i * 0.1) * 0.2);
            dummy.updateMatrix();
            symbiotesRef.current.setMatrixAt(i, dummy.matrix);
        }
        symbiotesRef.current.instanceMatrix.needsUpdate = true;

        const symbioteMat = symbiotesRef.current.material as THREE.MeshBasicMaterial;
        symbioteMat.opacity = fade * 0.9;

        // Final position
        const dive = transitionIn * 8 - transitionOut * 6;
        groupRef.current.position.z = dive + 3;

        groupRef.current.position.x = Math.sin(t * 0.1) * 0.2 + pointer.x * 0.2;
        groupRef.current.position.y = Math.cos(t * 0.05) * 0.15 + pointer.y * 0.15;
    });

    if (!visible) return null;

    return (
        <group ref={groupRef}>
            <mesh ref={coreRef} geometry={coreGeo}>
                <meshStandardMaterial
                    color="#0a0a12"
                    emissive="#4a2a40"
                    emissiveIntensity={0.5}
                    roughness={0.8}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            <mesh ref={glassShellRef} geometry={shellGeo}>
                <meshPhysicalMaterial
                    color="#ffffff"
                    transmission={0.5}
                    roughness={0.05}
                    ior={1.5}
                    thickness={1.2}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    transparent
                />
            </mesh>
            <lineSegments ref={equilibriaRef} geometry={equilibriumGeometry}>
                <lineBasicMaterial
                    color="#ffb3bd"
                    transparent
                    opacity={0.95}
                    linewidth={4}
                    blending={THREE.AdditiveBlending}
                />
            </lineSegments>
            <instancedMesh ref={symbiotesRef} args={[symbioteGeo, undefined, NUM_SYMBIOTES]}>
                <meshBasicMaterial
                    color="#ff98a2"
                    transparent
                    opacity={0.9}
                />
            </instancedMesh>
        </group>
    );
}
