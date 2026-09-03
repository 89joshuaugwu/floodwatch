import type { Metadata } from "next";
import { AppToaster } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FloodWatch — Smart Flood Monitoring",
  description:
    "Real-time flood monitoring with tiered water-level alerts and rate-of-rise detection. Public station status, no login required.",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
