import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Merriweather } from "next/font/google";
import { cn } from "@/lib/utils";

const merriweather = Merriweather({subsets:['latin'],variable:'--font-serif'});

export const metadata: Metadata = {
  title: "Norina — Lehrerzeit",
  description: "Zeiterfassung und Überstunden-Tracking für Lehrpersonen",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Norina",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de-CH" className={cn("font-serif", merriweather.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
