import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                void: "#000000",
                abyss: "#070707",
                obsidian: "#111111",
                charcoal: "#1a1a1a",
                graphite: "#222222",
                smoke: "#333333",
                silver: "#888888",
                mercury: "#b0b0b0",
                ice: "#f0f0f0",
                accent: "#ff98a2",
                "accent-glow": "#ffb3bd",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
                display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
            },
            fontSize: {
                "display-xl": ["clamp(4rem, 12vw, 12rem)", { lineHeight: "0.9", letterSpacing: "-0.04em" }],
                "display-lg": ["clamp(3rem, 8vw, 8rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
                "display-md": ["clamp(2rem, 5vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
                "display-sm": ["clamp(1.5rem, 3vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
            },
            animation: {
                "float": "float 6s ease-in-out infinite",
                "pulse-slow": "pulse-slow 4s ease-in-out infinite",
                "breathe": "breathe 8s ease-in-out infinite",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                "pulse-slow": {
                    "0%, 100%": { opacity: "0.4" },
                    "50%": { opacity: "1" },
                },
                breathe: {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.02)" },
                },
            },
            backdropBlur: {
                xs: "2px",
            },
        },
    },
    plugins: [],
};

export default config;
