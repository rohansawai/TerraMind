import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TerraMind - AI-Native Spatial IDE",
  description: "Transform natural language into geographic insights instantly. The first AI-native spatial IDE - Cursor for ArcGIS.",
  keywords: "GIS, spatial analysis, AI, geographic data, mapping, PostGIS",
  authors: [{ name: "TerraMind Team" }],
  openGraph: {
    title: "TerraMind - AI-Native Spatial IDE",
    description: "Transform natural language into geographic insights instantly",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
