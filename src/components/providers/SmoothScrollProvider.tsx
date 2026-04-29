"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
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

/** True when the device has a coarse pointer (touch). */
function isTouchDevice(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
}

export function SmoothScrollProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const lenisRef = useRef<unknown | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const rafCallbackRef = useRef<((time: number) => void) | null>(null);

    // FIX: Use a ref-based callback so it never changes identity.
    // The old useCallback version was listed in useEffect deps, causing
    // Lenis + GSAP to be torn down and re-created on every scroll event.
    const setScrollRef = useRef({ setScrollProgress, setScrollY });
    setScrollRef.current = { setScrollProgress, setScrollY };

    useEffect(() => {
        let lenis: any = null;
        let gsapModule: any = null;
        let ScrollTriggerModule: any = null;

        // Stable callback — never changes, never re-triggers useEffect
        const onScroll = (e: { scroll: number; limit: number; progress: number }) => {
            setScrollRef.current.setScrollProgress(e.progress);
            setScrollRef.current.setScrollY(e.scroll);
        };

        const init = async () => {
            try {
                const [gsapImport, stImport] = await Promise.all([
                    import("gsap"),
                    import("gsap/ScrollTrigger"),
                ]);

                gsapModule = gsapImport.gsap;
                ScrollTriggerModule = stImport.ScrollTrigger;

                gsapModule.registerPlugin(ScrollTriggerModule);

                ScrollTriggerModule.config({
                    ignoreMobileResize: true,
                    limitCallbacks: true,
                });

                if (!isTouchDevice()) {
                    const lenisModule = await import("lenis");
                    const Lenis = lenisModule.default;

                    lenis = new Lenis({
                        lerp: 0.035,
                        smoothWheel: true,
                        wheelMultiplier: 0.4,
                    });

                    lenisRef.current = lenis;

                    lenis.on("scroll", (e: any) => {
                        onScroll(e);
                        ScrollTriggerModule.update();
                    });

                    const rafCallback = (time: number) => {
                        lenis.raf(time * 1000);
                    };
                    rafCallbackRef.current = rafCallback;
                    gsapModule.ticker.add(rafCallback);
                    gsapModule.ticker.lagSmoothing(0);
                } else {
                    // On touch: track scroll for context consumers
                    const handleTouchScroll = () => {
                        const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
                        onScroll({ scroll: window.scrollY, limit: document.body.scrollHeight - window.innerHeight, progress });
                        ScrollTriggerModule.update();
                    };
                    window.addEventListener("scroll", handleTouchScroll, { passive: true });
                    (lenis as any) = { _touchScrollHandler: handleTouchScroll };
                }

            } catch (err) {
                console.error("SmoothScrollProvider init error:", err);
            }
        };

        init();

        return () => {
            if (lenis) {
                const touchHandler = (lenis as any)._touchScrollHandler;
                if (touchHandler) window.removeEventListener("scroll", touchHandler);
                if (typeof lenis.destroy === "function") lenis.destroy();
            }
            if (gsapModule && rafCallbackRef.current) {
                gsapModule.ticker.remove(rafCallbackRef.current);
            }
            if (ScrollTriggerModule) {
                ScrollTriggerModule.getAll().forEach((trigger: any) => trigger.kill());
            }
        };
    }, []); // ← empty deps: init once, never re-run

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