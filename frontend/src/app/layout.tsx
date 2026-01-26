import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Face ID — Verification",
  description: "Vérification d'identité par selfie + carte",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
