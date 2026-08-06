import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TF Hub Dashboard",
  description: "Dashboard operacional e de performance do TF Hub.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
