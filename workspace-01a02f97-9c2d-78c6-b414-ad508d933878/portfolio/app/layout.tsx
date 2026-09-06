import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { profile } from "@/lib/data/profile";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: {
    default: "Vaibhav Kumar — Backend Developer | Cybersecurity | AI",
    template: "%s · Vaibhav Kumar",
  },
  description:
    "Portfolio of Vaibhav Kumar — backend developer, cybersecurity engineer, and AI builder. Security operations platforms, threat-detection pipelines, and AI-agent systems, presented as an interactive digital engineering lab.",
  keywords: [
    "Vaibhav Kumar",
    "Backend Developer",
    "Cybersecurity Engineer",
    "AI Engineer",
    "Security Engineer",
    "Threat Detection",
    "SIEM",
    "MITRE ATT&CK",
    "FastAPI",
    "SOC",
    "AI Agents",
  ],
  authors: [{ name: profile.name }],
  creator: profile.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: profile.siteUrl,
    siteName: "Vaibhav Kumar — Engineering Lab",
    title: "Vaibhav Kumar — Backend Developer | Cybersecurity | AI",
    description:
      "Interactive digital engineering lab: security operations platforms, threat detection, and AI-agent systems built by Vaibhav Kumar.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: profile.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaibhav Kumar — Backend Developer | Cybersecurity | AI",
    description:
      "Security operations, threat detection, and AI-agent systems — an interactive engineering lab portfolio.",
    images: ["/og.jpg"],
  },
  alternates: {
    canonical: profile.siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#04060b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body">
        <MotionProvider>
          <SmoothScrollProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-pulse focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
            >
              Skip to content
            </a>
            <Navbar />
            <main id="main-content">{children}</main>
            <Footer />
          </SmoothScrollProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
