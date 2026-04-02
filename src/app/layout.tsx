import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { AwwwardsHUD } from "@/components/ui/AwwwardsHUD";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Jihed Hagui",
    description:
        "A cinematic 3D portfolio experience showcasing creative development, design, and engineering.",
    keywords: ["portfolio", "developer", "3D", "creative", "webgl", "react"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body
                className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased bg-void text-mercury`}
            >
                <SmoothScrollProvider>
                    <CustomCursor />
                    <AwwwardsHUD />
                    <div className="noise-overlay" aria-hidden="true" />
                    {children}
                </SmoothScrollProvider>
            </body>
        </html>
    );
}
