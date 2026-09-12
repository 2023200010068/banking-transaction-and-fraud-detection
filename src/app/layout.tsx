import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banking Fraud Detection System",
  description: "Banking Transaction and Fraud Detection System",
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