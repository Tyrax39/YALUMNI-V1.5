import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "YALUMNI Admin Console",
  description: "Role-based administrative console for the YALUMNI platform."
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
