import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Humynity | Verified Talent & Protected Escrow",
  description: "Frictionless task delegation. Verified human execution with protected payment hold.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-foreground-light bg-canvas-light dark:text-foreground-dark dark:bg-canvas-dark selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}