"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StructuringProps {
    progress: number;
    transitionIn: number;
    transitionOut: number;
    visible: boolean;
}

const NUM_FRAMEWORKS = 12;
const POINTS_PER_FRAMEWORK = 64;

export function Structuring({
    progress,
    transitionIn,
    transitionOut,
    visible,
}: StructuringProps) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const glassShellRef = useRef<THREE.Mesh>(null);
    const frameworksRef = useRef<THREE.LineSegments>(null);

    const { coreGeo, shellGeo } = useMemo(() => ({
        coreGeo: new THREE.IcosahedronGeometry(1.2, 64),
        shellGeo: new THREE.IcosahedronGeometry(1.4, 64),
    }), []);

    const frameworkGeometry = useMemo(() => {
        const totalSegments = NUM_FRAMEWORKS * (POINTS_PER_FRAMEWORK - 1);
        const positions = new Float32Array(totalSegments * 6);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame((state) => {
        if (!groupRef.current || !coreRef.current || !glassShellRef.current || !frameworksRef.current) return;

        const t = state.clock.elapsedTime;
        const { pointer, camera } = state;
        const easeIn = THREE.MathUtils.smoothstep(0, 1, transitionIn);
        const easeOut = THREE.MathUtils.smoothstep(0, 1, transitionOut);

        // Parallax tilt
        groupRef.current.rotation.y = pointer.x * 0.25;
        groupRef.current.rotation.x = pointer.y * 0.2;

        // Camera pan and focus
        camera.position.z = THREE.MathUtils.lerp(3, 4, progress);
        camera.position.x = Math.cos(t * 0.25) * 1.5 + pointer.x;
        camera.position.y = Math.sin(t * 0.25) * 1 + pointer.y;
        camera.lookAt(0, 0, 0);

        // Scale with structural buildup
        const heartScale = THREE.MathUtils.lerp(1.1, 1.3, easeIn) + Math.cos(t * 3) * 0.04 * progress;
        coreRef.current.scale.setScalar(heartScale);
        glassShellRef.current.scale.setScalar(heartScale);

        const breath = Math.sin(t * 1.8) * 0.03;
        coreRef.current.scale.multiplyScalar(1 + breath);
        glassShellRef.current.scale.multiplyScalar(1 + breath * 0.95);

        groupRef.current.rotation.y = t * 0.07 + pointer.x * 0.12;
        coreRef.current.rotation.y = t * 0.13 + pointer.x * 0.09;
        glassShellRef.current.rotation.x = Math.sin(t * 0.45) * 0.25 + pointer.y * 0.1;

        const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
        const shellMat = glassShellRef.current.material as THREE.MeshPhysicalMaterial;
        const fade = (1 - easeOut) * Math.min(easeIn + 0.3, 1);

        coreMat.opacity = fade * 0.88;
        shellMat.transmission = THREE.MathUtils.lerp(0.8, 0.72, progress);
        shellMat.opacity = fade;

        // Frameworks with angular snapping and vibration
        const posAttr = frameworksRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        const frameworkLength = THREE.MathUtils.lerp(25, 50, progress);
        const angularity = 0.6 + progress * 0.6;
        const globalRotate = t * 0.35;

        let idx = 0;
        for (let i = 0; i < NUM_FRAMEWORKS; i++) {
            const baseAngle = (i / NUM_FRAMEWORKS) * Math.PI * 2 + globalRotate * 0.3 + pointer.x * 0.05;

            for (let j = 0; j < POINTS_PER_FRAMEWORK - 1; j++) {
                const p0 = j / (POINTS_PER_FRAMEWORK - 1);
                const p1 = (j + 1) / (POINTS_PER_FRAMEWORK - 1);

                const wave = Math.sin(p0 * 10 + t * 3.5) * 0.2 * (1 - angularity) + Math.sin(t + i) * 0.1;
                const radius = 1.6 + p0 * 2.5 + Math.cos(p0 * Math.PI * 4) * 0.7;

                const z0 = p0 * frameworkLength;
                const z1 = p1 * frameworkLength;

                const angle0 = baseAngle + Math.floor(p0 * angularity * 12) / 12 * Math.PI * 1.5;
                const angle1 = baseAngle + Math.floor(p1 * angularity * 12) / 12 * Math.PI * 1.5;

                arr[idx++] = Math.cos(angle0) * radius + wave;
                arr[idx++] = Math.sin(angle0) * radius + wave * 0.9;
                arr[idx++] = z0 - frameworkLength * 0.3;

                arr[idx++] = Math.cos(angle1) * radius + wave * 1.1;
                arr[idx++] = Math.sin(angle1) * radius + wave * 1.5;
                arr[idx++] = z1 - frameworkLength * 0.3;
            }
        }
        posAttr.needsUpdate = true;

        const frameworkMat = frameworksRef.current.material as THREE.LineBasicMaterial;
        frameworkMat.opacity = fade * (0.92 + Math.cos(t * 7) * 0.08);

        // Position with pan
        const dive = transitionIn * 18 - transitionOut * 15;
        groupRef.current.position.z = dive - 7;

        groupRef.current.position.x = Math.sin(t * 0.3) * 0.3 + pointer.x * 0.4;
        groupRef.current.position.y = Math.cos(t * 0.25) * 0.25 + pointer.y * 0.3;
    });

    if (!visible) return null;

    return (
        <group ref={groupRef}>
            <mesh ref={coreRef} geometry={coreGeo}>
                <meshStandardMaterial
                    color="#0a0a12"
                    emissive="#4a2a40"
                    emissiveIntensity={0.7}
                    roughness={0.7}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            <mesh ref={glassShellRef} geometry={shellGeo}>
                <meshPhysicalMaterial
                    color="#ffffff"
                    transmission={0.82}
                    roughness={0.03}
                    ior={1.45}
                    thickness={1.4}
                    clearcoat={0.8}
                    clearcoatRoughness={0.04}
                    transparent
                />
            </mesh>
            <lineSegments ref={frameworksRef} geometry={frameworkGeometry}>
                <lineBasicMaterial
                    color="#ffb3bd"
                    transparent
                    opacity={0.9}
                    linewidth={2}
                    blending={THREE.AdditiveBlending}
                />
            </lineSegments>
        </group>
    );
}
