import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ТЕМПО | Шахматка",
  description: "Жилой комплекс ТЕМПО",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-white">{children}</body>
    </html>
  );
}
