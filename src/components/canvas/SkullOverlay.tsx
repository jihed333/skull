"use client";

import React, { forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Center, useGLTF, Environment } from "@react-three/drei";

function SkullModel() {
    const { scene } = useGLTF("/skull.glb");

    return (
        <Center>
            <primitive
                object={scene}
                scale={1.7}
                rotation={[0.05, Math.PI * 0.95, 0]}
                position={[0, -0.15, 0]}
            />
        </Center>
    );
}

useGLTF.preload("/skull.glb");

export const SkullOverlay = forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div
            ref={ref}
            className="absolute z-[25] pointer-events-none"
            style={{
                left: "27%",
                top: "14.9%",
                width: "54.6%",
                height: "53.3%",
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 6], fov: 35 }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={1.3} />
                <directionalLight position={[3, 4, 5]} intensity={2.3} />
                <directionalLight position={[-3, 1, 2]} intensity={1.2} />
                <SkullModel />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
});

SkullOverlay.displayName = "SkullOverlay";