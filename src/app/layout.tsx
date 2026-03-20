import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/QueryProvider";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Timely — Lehrerzeit",
  description: "Zeiterfassung und Überstunden-Tracking für Lehrpersonen",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timely",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F0F7F0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de-CH" suppressHydrationWarning className={cn(inter.variable)}>
      <body className="antialiased font-sans">
        <QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>
      </body>
    </html>
  );
}
