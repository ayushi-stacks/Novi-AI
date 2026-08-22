import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Canvas OS",
  description:
    "A production-quality prototype for an AI personal operating system built around context, memory, and connected work.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
