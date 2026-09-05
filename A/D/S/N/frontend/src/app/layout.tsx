import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AutoApply AI – Apply to 100 jobs while you sleep",
  description:
    "Autonomous AI agent that searches, scores, and submits job applications on your behalf using TinyFish browser automation and GPT-4.",
  keywords: "job application, AI, automation, auto-apply, job search",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans bg-[#0a0a0f] text-slate-100 min-h-screen antialiased`}
      >
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
