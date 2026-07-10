import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "StackPilot — AI Framework Masterclass",
  description: "Developer-focused AI documentation & framework masterclass dashboard powered by Neon RAG + Gemini.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} bg-canvas text-ink font-sans antialiased h-screen overflow-hidden selection:bg-accent/25 selection:text-accent-bright`}
      >
        {children}
      </body>
    </html>
  );
}
