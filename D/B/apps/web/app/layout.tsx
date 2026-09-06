import type { ReactNode } from "react";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { PwaRegistration } from "./components/PwaRegistration";

export const metadata = {
  title: "Ninor Video Chat",
  description: "Random 15-second video chat MVP",
  manifest: "/manifest.json"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        {children}
        <CookieConsentBanner />
        <PwaRegistration />
      </body>
    </html>
  );
}

