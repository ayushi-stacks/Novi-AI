import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVI",
  description:
    "A beautiful AI layer over your actual digital life, built around context, memory, sources, and connected work.",
  applicationName: "NOVI",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "NOVI",
    description: "Your world, understood.",
    siteName: "NOVI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NOVI",
    description: "Your world, understood.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
