import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "YALUMNI Super Admin Console",
  description: "Platform owner diagnostics and security oversight for YALUMNI."
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
