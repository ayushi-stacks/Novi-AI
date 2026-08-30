import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const description =
  "NOVI is an AI personal intelligence environment for context, memory, sources, and connected work.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const safeHost = forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) ? forwardedHost : null;
  const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  const origin = safeHost ? `${protocol}://${safeHost}` : "https://life-canvas-os.jobsuit-0163.chatgpt.site";
  const socialImage = `${origin}/og.png`;

  return {
    title: "NOVI",
    description,
    applicationName: "NOVI",
    manifest: "/manifest.webmanifest",
    openGraph: {
    title: "NOVI",
    description: "Your world, understood.",
    siteName: "NOVI",
    type: "website",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "NOVI Life Canvas" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NOVI",
      description: "Your world, understood.",
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/brand/novi-app-icon.svg",
    },
  };
}

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
