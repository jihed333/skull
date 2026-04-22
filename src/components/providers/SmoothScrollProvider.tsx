"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from "react";

interface ScrollContextValue {
    lenis: unknown | null;
    scrollProgress: number;
    scrollY: number;
}

const ScrollContext = createContext<ScrollContextValue>({
    lenis: null,
    scrollProgress: 0,
    scrollY: 0,
});

export const useScrollContext = () => useContext(ScrollContext);

export function SmoothScrollProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const lenisRef = useRef<unknown | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const rafCallbackRef = useRef<((time: number) => void) | null>(null);

    const onScroll = useCallback((e: { scroll: number; limit: number; progress: number }) => {
        setScrollProgress(e.progress);
        setScrollY(e.scroll);
    }, []);

    useEffect(() => {
        let lenis: any = null;
        let gsapModule: any = null;
        let ScrollTriggerModule: any = null;

        const init = async () => {
            try {
                // Dynamic imports to avoid SSR issues
                const [lenisModule, gsapImport, stImport] = await Promise.all([
                    import("lenis"),
                    import("gsap"),
                    import("gsap/ScrollTrigger"),
                ]);

                const Lenis = lenisModule.default;
                gsapModule = gsapImport.gsap;
                ScrollTriggerModule = stImport.ScrollTrigger;

                gsapModule.registerPlugin(ScrollTriggerModule);

                lenis = new Lenis({
                    lerp: 0.05,
                    smoothWheel: true,
                    wheelMultiplier: 0.6,
                });

                lenisRef.current = lenis;

                lenis.on("scroll", (e: any) => {
                    onScroll(e);
                    ScrollTriggerModule.update();
                });

                // Sync GSAP ticker with Lenis
                const rafCallback = (time: number) => {
                    lenis.raf(time * 1000);
                };
                rafCallbackRef.current = rafCallback;
                gsapModule.ticker.add(rafCallback);
                gsapModule.ticker.lagSmoothing(0);

                // Update ScrollTrigger on resize
                const handleResize = () => {
                    ScrollTriggerModule.refresh();
                };
                window.addEventListener("resize", handleResize);

                // Store cleanup reference
                (lenis as any)._resizeHandler = handleResize;
            } catch (err) {
                console.error("SmoothScrollProvider init error:", err);
            }
        };

        init();

        return () => {
            if (lenis) {
                const handleResize = (lenis as any)._resizeHandler;
                if (handleResize) window.removeEventListener("resize", handleResize);
                lenis.destroy();
            }
            if (gsapModule && rafCallbackRef.current) {
                gsapModule.ticker.remove(rafCallbackRef.current);
            }
            if (ScrollTriggerModule) {
                ScrollTriggerModule.getAll().forEach((trigger: any) => trigger.kill());
            }
        };
    }, [onScroll]);

    return (
        <ScrollContext.Provider
            value={{
                lenis: lenisRef.current,
                scrollProgress,
                scrollY,
            }}
        >
            {children}
        </ScrollContext.Provider>
    );
}
