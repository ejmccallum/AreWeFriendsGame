import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Are We Friends?",
  description: "A fast, friendly 2v2 guessing game."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
