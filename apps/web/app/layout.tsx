import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "YALUMNI | YALI Alumni Platform",
  description:
    "A modern verified alumni network for discovery, communities, events, initiatives, contributions, and governance."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

