import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Wishlist · Crémaillère",
  description: "La liste de cadeaux de la crémaillère. Choisis un objet et réserve-le en un clic.",
  openGraph: {
    title: "Home Wishlist · Crémaillère du samedi 28",
    description: "Choisis un cadeau et réserve-le pour éviter les doublons.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBFBF8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&family=Caveat:wght@600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
