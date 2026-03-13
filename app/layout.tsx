import type { Metadata } from "next";
import { LeftSidebar } from "@/components/LeftSidebar";
import "./globals.css";
import "@/styles/chessboard.css";
import { Suspense } from "react";

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
      <body className="bg-white">
        <div className="flex min-h-screen bg-white">
          <Suspense fallback={<div className="w-[200px]" />}>
            <LeftSidebar />
          </Suspense>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
