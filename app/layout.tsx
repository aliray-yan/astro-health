import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astro Health — Mission Monitor",
  description:
    "Astronaut health monitoring dashboard — simulated long-duration mission telemetry with personal-baseline anomaly detection. Built for NASA Space Apps Challenge 2026.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#05070d" },
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`const theme = localStorage.getItem("astro-health-theme"); if (theme === "light") document.documentElement.dataset.theme = theme;`}
        </Script>
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
