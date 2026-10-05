import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout"; // <-- Imported here

export const metadata: Metadata = {
  title: "AnonGig | Anonymous Marketplace",
  description: "The secure, zero-bias platform where top talent meets urgent tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-foreground-light bg-canvas-light dark:text-foreground-dark dark:bg-canvas-dark">
        {/* Wrapping the entire app in your new Auth Guard & Layout */}
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}